#version 400
out vec4 fragColor;

/*
  Special thanks

  Inspirations:
    Wolfire Games
    Digital Foundry
    id Software
    Casey Muratori

  Learning resources:
    https://learnopengl.com/
*/

/*
  0 -- disabled
  1 -- on
  2 -- bounce light
*/
uniform int ssaoQuality;
/*
  0 -- disabled
  1 -- simplified
  2 -- multisampled
*/
uniform int shadowQuality;

uniform sampler2D shadowMap;
uniform mat4 lightTransform;
uniform mat4 transform;
uniform mat4 view;
uniform mat4 projection;

uniform sampler2D depth;
uniform sampler2D specRough;
uniform sampler2D albedo;
uniform sampler2D normals;

in vec2 vTexCoord;

in mat4 iview;
in mat4 iprojection;
in mat4 tview;
in mat4 tilight;

uniform vec3 cameraPosition;
uniform vec3 cameraVector;
uniform vec2 viewportSize;

uniform float noiseTile[16];
uniform vec2 poissonDisk[16];
const int diskSize = 16;

const int kernelSize = 32;
uniform vec3 ssaoKernel[kernelSize];

// adapted from http://glampert.com/2014/01-26/visualizing-the-depth-buffer/
float linearizeDepth(in float depth, in float zNear, in float zFar) {
  return (2.0 * zNear) / (zFar + zNear - depth * (zFar - zNear));
}

// adapted via http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
// canonical one-liner appears to have no original source, but discussion here:
// https://stackoverflow.com/questions/12964279/whats-the-origin-of-this-glsl-rand-one-liner
float rand(vec2 co) {
  float a = 12.9898;
  float b = 78.233;
  // float c = 334.393;
  float d = 43758.5453;
  float dt = dot(co.xy, vec2(a, b));
  float sn = mod(dt, 3.14159);
  return fract(sin(sn) * d);
}

float rand3_good(vec3 co) {
  float a = 12.9898;
  float b = 78.233;
  float c = 334.393;
  float d = 43758.5453;
  float dt = dot(co.xyz, vec3(a, b, c));
  float sn = mod(dt, 3.14159);
  return fract(sin(sn) * d);
}

// a good-enough random generator when combined with an entropy source, avoids sin
float rand3(vec3 co) {
  float dt = dot(co.xyz, vec3(12.9898, 78.233, 334.393));
  return fract(dt);
}

vec3 viewPosFromDepth(float depth) {
    float z = depth * 2.0 - 1.0;

    vec4 clipSpacePosition = vec4(vTexCoord * 2.0 - 1.0, z, 1.0);
    vec4 viewSpacePosition = iprojection * clipSpacePosition;

    // Perspective division
    viewSpacePosition /= viewSpacePosition.w;

    return viewSpacePosition.xyz;
}


const vec3 straightVector = vec3(0.0, 0.0, -1.0);
// returns [direct lighting, shadow intensity]
vec2 lightingCalculation(float bias, vec4 fragPosLightSpace, vec4 fragNormalLightSpace) {
  // float bias = max(0.005 * (1.0 - dot(normal, normalize(pos - lightPos.xyz))), 0.005);
  float direct = clamp(dot(fragNormalLightSpace.xyz, straightVector), -0.5, 1.0);
  if (shadowQuality == 0) {
    return vec2(direct);
  }

  // perform perspective divide
  vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
  // transform to [0,1] range
  projCoords = projCoords * 0.5 + 0.5;
  if (projCoords.x < 0.0 || projCoords.x > 1.0 || projCoords.y < 0.0 || projCoords.y > 1.0 || projCoords.z > 1.0) {
    return vec2(direct);
  }

  // get depth of current fragment from light's perspective
  float currentDepth = projCoords.z;

  if (shadowQuality == 1) {
    // get closest depth value from light's perspective (using [0,1] range fragPosLight as coords)
    float closestDepth = texture(shadowMap, projCoords.xy).r;
    // check whether current frag pos is in shadow

    // non-multisampled version
    float shadow = currentDepth > closestDepth - bias ? 0.0 : 1.0;
    return vec2(direct, shadow);
  }

  vec2 texelSize = 1.0 / vec2(textureSize(shadowMap, 0));
  float shadow = 0.0;
  const int size = 1;
  vec2 poissonSize = texelSize * 2.0;

  for (int x = -size; x <= size; ++x) {
    for (int y = -size; y <= size; ++y) {
      float visibility = 1.0;
      vec2 coord = projCoords.xy + poissonDisk[y + int(projCoords.x) % diskSize] * poissonSize + vec2(x, y) * texelSize;
      if (texture(shadowMap, coord).r >= currentDepth - bias) {
        visibility = 0.0;
      }
      shadow += visibility;
    }
  }
  shadow /= float((size * 2 + 1) * (size * 2 + 1));

  return vec2(direct, 1.0 - shadow);
}

const vec3 lightVector = vec3(0.0, -1.0, 0.0);
const vec3 lightPosition = vec3(0.0, -500.0, 1000.0);
const vec3 ambientLight = vec3(0.1);
const vec3 diffuseLight = vec3(0.9);
const vec3 sunLight = vec3(1.2);

const float kernelScale = 1.0 / float(kernelSize);
const float ssaoRadius = 14.0;
const float ssaoBias = 0.072;
// const float ssaoBias = 0.0;
const float disocclusionAntiBias = -0.5;

const float gamma = 1.8;
const float exposure = 1.0;

const float bounceLight = 1.0;
const float occlusionScale = 1.0;
const float disocclusionScale = 1.0;

// returns [occlusion, disocclusion, bounce light r/g/b]
float[5] ssao(vec3 viewPos, vec3 viewNormal) {
  int x = int(gl_FragCoord.x * viewPos.z) % 4 + int(gl_FragCoord.y * viewPos.x) % 4 * 4;
  int y = int(gl_FragCoord.y * viewPos.y) % 4 + int(gl_FragCoord.x * viewPos.z) % 4 * 4;
  vec3 bounce = vec3(0.0);
  vec3 randomVec = normalize(vec3(rand3(viewPos.xyz + viewNormal) * 2.0 - 1.0, rand3(viewPos.zyx + viewNormal.xzy) * 2.0 - 1.0, 0.0));
  // vec3 randomVec = vec3(0.5, 0.5, 0.0);
  // vec3 randomVec = normalize(vec3(noiseTile[x] * 2.0 - 1.0, noiseTile[y] * 2.0 - 1.0, 0.0));
  // create TBN change-of-basis matrix: from tangent-space to view-space
  vec3 tangent = normalize(randomVec - viewNormal * dot(randomVec, viewNormal));
  // vec3 tangent = normalize(viewNormal * viewNormal);
  vec3 bitangent = cross(viewNormal, tangent);
  mat3 tbn = mat3(tangent, bitangent, viewNormal);
  // iterate over the sample kernel and calculate occlusion factor
  float occlusion = 0.0;
  float disocclusion = 0.0;

  for (int i = 0; i < kernelSize; i++) {
    // get sample position
    vec3 kernelSample = ssaoKernel[i].xyz;
    vec3 s = tbn * kernelSample * ssaoRadius + viewPos; // from tangent to view-space

    // project sample position (to sample texture) (to get position on screen/texture)
    vec4 offset = projection * vec4(s, 1.0); // from view to clip-space
    offset.xy = offset.xy / offset.w * 0.5 + 0.5; // transform to range 0.0 - 1.0

    // get sample depth
    // float sampleDepth = texture(position, offset.xy).z; // get depth value of kernel sample
    vec3 samplePos = viewPosFromDepth(texture(depth, offset.xy).r); // get depth value of kernel sample
    float sampleDepth = samplePos.z; // get depth value of kernel sample

    // range check & accumulate
    float range = ssaoRadius / abs(viewPos.z - sampleDepth);
    float rangeCheck = smoothstep(0.0, 1.0, range);
    if (sampleDepth > s.z + ssaoBias) {
      // if (kernelSample.z <= 0.0) {
        // this is always false now...
        // but there seem to still be cases where walls can occlude themselves
        // disocclusion += rangeCheck;
        // disocclusion += smoothstep(1.0, 0.0, ssaoRadius / pow(abs(viewPos.z - sampleDepth), 2.0));
      // } else {
      occlusion += rangeCheck;

      if (ssaoQuality >= 2) {
        // rough bounce lighting
        // get sample color
        vec3 sampleAlbedo = texture(albedo, offset.xy).rgb;

        // vec3 samplePos2 = texture(position, offset.xy).rgb;
        float depth = texture(depth, offset.xy).r;
        vec3 samplePos2 = viewPosFromDepth(depth);

        // float edge = -dot(viewNormal, normalize(viewPos.xyz));

        // vec3 sampleNormal = texture(normal, offset.xy).rgb;
        float scale = smoothstep(0.0, 1.0, 1.0 - length(samplePos2 - viewPos) / ssaoRadius);
        bounce += scale * sampleAlbedo;
      }
      // }
    }
  }

  bounce *= bounceLight;
  return float[] (occlusion * occlusionScale * kernelScale, disocclusion * disocclusionScale * kernelScale, bounce.r * kernelScale, bounce.g * kernelScale, bounce.b * kernelScale);
}

// SSAO-inspired rim lighting effect
float rimLight(vec3 viewPos, vec3 viewNormal) {
  int x = int(gl_FragCoord.x * viewPos.z) % 4 + int(gl_FragCoord.y * viewPos.x) % 4 * 4;
  int y = int(gl_FragCoord.y * viewPos.y) % 4 + int(gl_FragCoord.x * viewPos.z) % 4 * 4;

  float occlusion = 1.0;

  // the point in space
  vec3 sampleViewPos = viewPos + vec3(viewNormal.x, viewNormal.y, viewNormal.z);

  vec4 offset = projection * vec4(sampleViewPos, 1.0); // from view to clip-space
  offset.xy = offset.xy / offset.w * 0.5 + 0.5; // transform to range 0.0 - 1.0

  // get sample depth
  // float sampleDepth = texture(position, offset.xy).z; // get depth value of kernel sample
  // the full position for the sample at the location of the point in space on the screen
  vec3 samplePos = viewPosFromDepth(texture(depth, offset.xy).r); // get depth value of kernel sample
  float sampleDepth = samplePos.z; // get depth value of kernel sample
  float rangeCheck = smoothstep(0.0, 1.0, ssaoRadius / abs(viewPos.z - sampleDepth));
  // occlusion += (sampleDepth >= samplePos.z + ssaoBias ? 1.0 : 0.0) * rangeCheck;
  occlusion       -= (sampleDepth < sampleViewPos.z ? 1.0 : 0.0) * rangeCheck;

  // occlusion = clamp((sampleDepth - sampleViewPos.z) / 100.0, 0.0, 1.0);
  // occlusion = viewPos.z / -1000;

  // return float[] (occlusion * occlusionScale * kernelScale, disocclusion * disocclusionScale * kernelScale, bounce.r * kernelScale, bounce.g * kernelScale, bounce.b * kernelScale);
  return occlusion * occlusionScale;
}

const vec3 ihdrScale = vec3(1.0 / 4.0);

void main(void) {
  vec3 albedo = texture(albedo, vTexCoord).xyz;
  vec3 specRough = texture(specRough, vTexCoord).xyz;
  float depth = texture(depth, vTexCoord).r;
  vec3 viewPos = viewPosFromDepth(depth);
  vec3 pos = (iview * vec4(viewPos, 1.0)).xyz;
  vec3 viewNormal = texture(normals, vTexCoord).xyz * 2.0 - 1.0;
  vec3 normal = (tview * vec4(viewNormal, 0.0)).xyz;
  float shadowDepth = texture(shadowMap, vTexCoord).r;

  vec4 lightPos = lightTransform * vec4(pos, 1.0);
  vec4 lightNormal = normalize(tilight * vec4(normal, 0.0));

  // float edgeFade = smoothstep(0.0, 0.8,
  //   clamp(0.0, 1.0, (vTexCoord.x * vTexCoord.y) * (1.0 - (vTexCoord.x * vTexCoord.y)))
  // );
  float edgeFade = 1.0;

  // ssao
  float[5] ssaoProbe = ssaoQuality == 0 ? float[](0.0, 0.0, 0.0, 0.0, 0.0) : ssao(viewPos, viewNormal);
  float occlusion = ssaoProbe[0] * ssaoProbe[0];
  float disocclusion = ssaoProbe[1];
  float iocclusion = ssaoQuality == 0 ? 1.0 : 1.0 - occlusion * gamma * edgeFade;
  disocclusion = ssaoQuality == 0 ? 0.0 : disocclusion * edgeFade;
  // float depthRim = ssaoProbe[1];
  vec3 bounceLight = pow(vec3(ssaoProbe[2], ssaoProbe[3], ssaoProbe[4]), vec3(2.0));
  float rimAntiOcclusion = rimLight(viewPos, viewNormal);

  // float edge = -dot(viewNormal, normalize(viewPos.xyz));

  vec2 allLighting = lightingCalculation(0.0, lightPos, lightNormal);
  float direct = allLighting[0] - occlusion;
  float lighting = direct * 0.25 + min(direct * 0.5, allLighting[1] * iocclusion * 0.5) + allLighting[1] * iocclusion * 0.25;
  // float lighting = 0.0;
  // float direct = (dot(normal, lightVector) * 1.25 + 0.75) * 0.75;
  // float direct = 1.0;
  // lighting = min(lighting, direct);
  // float depthFog = max(0.25, 1.0 - linearizeDepth(dep, 10.0, 1500.0)) + 0.5;
  float depthFog = pow(clamp(1.0 - (viewPos.z - 200) / 9000.0, 0.0, 1.0), 2.2);

  // specularity
  // float shininess = 0.4;
  // float spexponent = 16.0;
  float shininess = specRough.r * 8.0;
  float spexponent = specRough.g * 16.0;
  vec3 lightDir = normalize(lightPosition - pos);
  vec3 viewDir = normalize(cameraPosition - pos);
  vec3 halfwayDir = normalize(lightDir + viewDir);
  float shine = pow(max(dot(normal, halfwayDir), 0.0), spexponent) * shininess;
  float spec = min((lighting + shine), shine);
  // float spec = pow(dot(normal, halfwayDir), 3.0);
  // float spec = dot(viewDir, normal);
  float specularity = spec * shininess * lighting;

  vec3 ambient = pow(ambientLight * albedo + bounceLight * ambientLight, vec3(0.5));
  vec3 lit = diffuseLight * albedo;
  vec3 sun = sunLight * lighting * albedo;
  vec3 rimColor = rimAntiOcclusion * (0.1 + lit);

  vec3 c = (rimColor + specularity + ambient + lit + sun) * depthFog + (1.0 - depthFog) * 0.5;
  // fragColor = vec4(c, 1.0);
  fragColor = vec4(c * ihdrScale, 1.0);

  // fragColor = vec4(bounceLight, 1.0);
  // fragColor = vec4(c * 0.0 + bounceLight * 2.5, 1.0);
  // fragColor = vec4((c.r + c.g + c.b)/3, (bounceLight.r + bounceLight.g + bounceLight.b)/3, abs((c.r + c.g + c.b)/3 - (bounceLight.r + bounceLight.g + bounceLight.b)/3), 1.0);
  // fragColor = vec4(normalize(bounceLight), 1.0);
  // fragColor = vec4(vec3(lit * pow(depthRim, 2.0) * 2.0), 1.0);
  // fragColor = vec4(vec3(pow(spec, edge)), 1.0);
  // fragColor = vec4(vec3(spec), 1.0);
  // fragColor = vec4(vec3(edgeFade), 1.0);
  // fragColor = vec4(vec3(iocclusion), 1.0);
  // fragColor = vec4(vec3(1.0 - occlusion * 4.0), 1.0);
  // fragColor = vec4(vec3(1.0 - clamp(occlusion, 0.0, 1.0)), 1.0);
  // fragColor = vec4(viewNormal, 1.0);
  // fragColor = vec4(vec3(1.0 - occlusion) * ihdrScale, 1.0);
  // fragColor = vec4(vec3(occlusion) * 0.5 + bounceLight * 0.5, 1.0);
  // fragColor = vec4(occlusion, disocclusion, 0.0, 1.0); // pretty SSAO testing
  // fragColor = vec4(occlusion > 0.5 ? 1.0 : 0.0, occlusion < 0.5 ? 1.0 : 0.0, occlusion < 0.0 ? 1.0 : 0.0, 1.0);
  // fragColor = vec4(vec3(rimAntiOcclusion), 1.0);
  // fragColor = vec4(0.5 + vec3(disocclusion), 1.0);
  // fragColor = vec4(0.0, 0.0, sampleDepth.z * 0.01, 1.0);
  // fragColor = vec4(viewPos.xyz * 0.01, 1.0);
  // fragColor = vec4(sampleDepth.xy * 0.01, 0.0, 1.0);
  // fragColor = vec4(0.0, 0.0, (viewPos.z - sampleDepth.z) * 0.1, 1.0);
  // fragColor = vec4(s * 0.01, 1.0);
  // fragColor = vec4((viewPos.xyz - sampleDepth.xyz) * 10.0, 1.0);
  // fragColor = vec4(offset.xy, 0.0, 1.0);
  // fragColor = vec4(vTexCoord.xy, 0.0, 1.0);
  // fragColor = vec4(randomVec * 0.5 + 0.5, 1.0);

  // fragColor = vec4(viewPos / 1000.0, 1.0);
  // fragColor = vec4(vec3(lightPos), 1.0);
  // fragColor = vec4(vec3(depth), 1.0);
  // fragColor = vec4(viewPosFromDepth(depth) / 1000.0, 1.0);
  // fragColor = vec4(viewPosFromDepth(depth) - viewPos, 1.0);

  // fragColor = vec4(direct * albedo, 1.0);
  // fragColor = vec4(albedo * ihdrScale, 1.0);
  // fragColor = vec4(normal, 1.0);
  // fragColor = vec4(pos / 100.0, 1.0);
  // fragColor = vec4(tangent, 1.0);
  // fragColor = vec4(lightDir * 2.0 + 1.0, 1.0);
  // fragColor = vec4(spec * vec3(1.0, 1.0, 1.0), 1.0);
  // fragColor = vec4(specularity * vec3(1.0, 1.0, 1.0), 1.0);
  // fragColor = vec4(1.0 - vec3(texture(shadowMap, vTexCoord).r), 1.0);
  // fragColor = vec4(1.0 - vec3(linearDepth), 1.0);
  // fragColor = vec4(vec3(lighting), 1.0);
  // fragColor = vec4(lightNormal.xyz * vec3(0.5, 0.5, 0.5) + vec3(0.5, 0.5, 0.5), 1.0);
  // fragColor = vec4(normal.xyz * 0.5 + 0.5, 1.0);

  // fragColor = vec4(pos * 0.001, 1.0);
}

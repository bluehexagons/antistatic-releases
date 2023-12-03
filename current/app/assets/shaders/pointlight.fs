#version 400

in vec4 vAlbedo;
in vec4 vCenter;
in vec4 vProps;
in float size;
in vec3 viewCenter;
in vec4 viewPos;
in mat4 iprojection;

in vec4 lightPos;

out vec4 fragColor;

uniform sampler2D specRough;
uniform sampler2D depth;
uniform sampler2D albedo;
uniform sampler2D normals;

uniform float noiseTile[16];

uniform vec2 viewportSize;

const vec3 gamma = vec3(2.2);
const float exposure = 1.0;

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

const vec3 ihdrScale = vec3(1.0 / 4.0);

vec3 viewPosFromDepth(float depth, vec2 coord) {
    float z = depth * 2.0 - 1.0;

    vec4 clipSpacePosition = vec4(coord * 2.0 - 1.0, z, 1.0);
    vec4 viewSpacePosition = iprojection * clipSpacePosition;

    // Perspective division
    viewSpacePosition /= viewSpacePosition.w;

    return viewSpacePosition.xyz;
}

void main(void) {
  float fadeIn = vProps.x;
  float fadeOut = vProps.y;
  float shine = vProps.z;
  float noiseRatio = vProps.w;

  // vec3 randomVec = normalize(vec3(rand3(pos.xyz), rand3(pos.zyx), rand3(pos.yzx)));
  vec3 lightColor = vAlbedo.rgb;
  vec2 coord = gl_FragCoord.xy / viewportSize;
  float depth = texture(depth, coord).r;
  vec3 surfacePos = viewPosFromDepth(depth, coord);
  // vec3 surfacePos = texture(position, coord).xyz;
  // vec3 albedo = texture(albedo, coord).xyz;
  vec3 surfaceNormal = normalize(texture(normals, coord).xyz * 2.0 - 1.0);
  vec3 diff = vCenter.xyz - surfacePos;
  float pct = pow(1.0 - clamp(length(diff) / size, 0.0, 1.0), 2.0);
  // float dist = 1.0 - clamp(d / vCenter.w, 0.0, 1.0);
  // float close = clamp(pow(0.5 - d / (vCenter.w * 0.25), 7.0), 0.0, 1.0);

  vec3 lightDir = normalize(diff);
  float surfaceEdge = 0.5 + clamp(1.0 - pow(-dot(surfaceNormal, normalize(surfacePos.xyz)), 2.0), 0.0, 1.0) * 0.8;
  float d = clamp(dot(surfaceNormal, lightDir), 0.0, 1.0);
  float glancing = pow(clamp(d * dot(lightDir, normalize(surfacePos)), 0.0, 1.0), 2.0) * pct;
  float shininess = pow(mix(0.0, shine, d), 2.0) * surfaceEdge;

  float smoothAmount = 0.75 / noiseRatio;
  float noiseAmount = 0.75 * noiseRatio;
  vec3 orbNormal = normalize(viewPos.xyz - vCenter.xyz);
  // float glow = surfacePos.z > viewPos.z ? smoothstep(0.6, 1.0, dot(orbNormal  viewPos.xyz)) : 0.0;

  float orbEdge = -dot(orbNormal, normalize(viewPos.xyz));
  float inverseRim = max(smoothstep(fadeIn, fadeOut, 1.0 - sqrt(1.0 - orbEdge)), 0.0);

  // float noiseSample = noiseTile[(int(surfacePos.x) % 4 + int(surfacePos.y) % 4 * 4 + int(surfacePos.y * surfaceNormal.x)) % 16];
  // float noiseSample = noiseTile[int(gl_FragCoord.x) % 4 + int(gl_FragCoord.y) % 4 * 4];
  float noiseSample = rand3_good(gl_FragCoord.xyz);
  float noise = noiseSample * noiseAmount * smoothstep(0.0, 0.5, inverseRim) * fadeOut;
  float glow = pow(inverseRim * (smoothAmount + noise), 2.0);

  // fragColor = vec4(lightColor, clamp(vAlbedo.a * max(shininess, 1.0 / close) / (d * d), 0.0, 1.0));
  // fragColor = vec4(pow(lightColor * clamp(vAlbedo.a, 0.0, 1.0) * shininess * pct, gamma), 1.0);
  // fragColor = vec4(vec3(dot(lightDir, surfaceNormal) * 2.0), 1.0);
  // fragColor = min(vec4(1.0, 1.0, 1.0, 1.0), vec4(albedo, dist));
  vec3 c = lightColor * vec3(shininess + glancing) * pct + lightColor * glow;
  fragColor = vec4(c * ihdrScale, 1.0);
  // fragColor = vec4(vec3(surfaceEdge), 1.0);
  // fragColor = vec4(vec3(noiseSample), 1.0);
  // fragColor = vec4(vec3(glancing), 1.0);
  // fragColor = vec4(vCenter.xyz * 0.01, 1.0);
  // fragColor = vec4(vCenter.xy, 0.0, 1.0);
  // fragColor = vec4(surfacePos.x * 0.01, vCenter.x * 0.01, 0.5, 1.0);
  // fragColor = vec4((int(gl_FragCoord.x) % 2 == 0 ? surfacePos.xy : vCenter.xy) * 0.1, 0.0, 1.0);
  // fragColor = vec4(surfacePos.x * 0.01, 1.0 - surfacePos.x * 0.01, 0.0, 1.0);
  // fragColor = vec4(vCenter.x * 0.01, 1.0 - vCenter.x * 0.01, 0.0, 1.0);
  // fragColor = vec4(viewCenter.xy * 0.001, 0.0, 1.0);
  // fragColor = vec4(lightColor * glow, 1.0);
  // fragColor = vec4((vCenter.xy - viewPos.xy) * 0.01, 0.0, 1.0);
  // fragColor = vec4(vCenter.xy, 0.0, 1.0);
}

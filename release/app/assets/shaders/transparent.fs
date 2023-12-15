#version 400

in vec3 vWorldPos;
in vec3 vWorldNormal;

in vec4 vAlbedo;

in vec4 lightPos;
in float linearDepth;

out vec4 fragColor;

uniform sampler2D shadowMap;

uniform vec3 cameraPosition;

uniform vec2 poissonDisk[16];

float LightingCalculation(vec4 fragPosLightSpace) {
  // perform perspective divide
  vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
  // transform to [0,1] range
  projCoords = projCoords * 0.5 + 0.5;
  if (projCoords.x < 0.0 || projCoords.x > 1.0 || projCoords.y < 0.0 || projCoords.y > 1.0) {
    return 1.0;
  }
  // get closest depth value from light's perspective (using [0,1] range fragPosLight as coords)
  float closestDepth = texture(shadowMap, projCoords.xy).r;
  // get depth of current fragment from light's perspective
  float currentDepth = projCoords.z;
  // check whether current frag pos is in shadow

  // non-multisampled version
  // float shadow = currentDepth > closestDepth + 0.0001 ? 0.0 : 1.0;

  const float bias = 0.0;
  vec2 texelSize = 1.0 / vec2(textureSize(shadowMap, 0));
  float shadow = 0.0;
  const int size = 1;
  vec2 poissonSize = texelSize * 2.0;

  for (int x = -size; x <= size; ++x) {
    for (int y = -size; y <= size; ++y) {
      float visibility = 1.0;
      if (texture(shadowMap, projCoords.xy + poissonDisk[y + int(projCoords.x) % 16] * poissonSize + vec2(x, y) * texelSize).r >= currentDepth - bias) {
        visibility = 0.0;
      }
      shadow += visibility;
    }
  }
  shadow /= float((size * 2 + 1) * (size * 2 + 1));
  return 1.0 - shadow;
}

const vec3 lightVector = vec3(0.0, -1.0, 0.0);
const vec3 lightPosition = vec3(0.0, -500.0, 1000.0);
const vec3 ambientLight = vec3(0.3, 0.3, 0.3);
const vec3 diffuseLight = vec3(0.5, 0.5, 0.5);
const vec3 sunLight = vec3(0.2, 0.2, 0.2);

const float ihdrScale = 1.0 / 4.0;

void main(void) {
  // float lighting = LightingCalculation(lightPos);
  float lighting = 1.0;
  float direct = 1.0;
  vec3 albedo = vAlbedo.rgb;

  float shininess = 1.8;
  vec3 lightDir = normalize(lightPosition - vWorldPos);
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  vec3 halfwayDir = normalize(lightDir + viewDir);
  float shine = pow(max(dot(vWorldNormal, halfwayDir), 0.0), 16.0) * shininess;
  float spec = min((lighting + shine), shine);

  vec3 c = vec3(spec * shininess) + ambientLight * albedo + albedo * diffuseLight * direct + sunLight * albedo * lighting * linearDepth;
  fragColor = vec4(c, vAlbedo.w * ihdrScale);
  // fragColor = vec4(spec * vec3(1.0, 1.0, 1.0), 1.0);
  // fragColor = vec4(vWorldPos, 1.0);
}

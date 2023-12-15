#version 400

uniform mat4 transform;
uniform mat4 view;
uniform mat4 projection;
uniform mat4 lightTransform;

layout(location = 0) in vec3 pos;
layout(location = 1) in vec3 normal;

layout(location = 2) in vec3 albedo;
// these names are meaningless
layout(location = 3) in vec3 blank;
// [specularity, specularityExp, roughness]
layout(location = 4) in vec3 specRough;

// out vec3 vWorldNormal;
out vec3 vNormal;

out vec3 vAlbedo;
out float specularity;
out float specularityExp;
out float roughness;

out vec4 lightPos;

void main(void) {
  vec4 vPos = view * vec4(pos, 1.0);
  gl_Position = projection * vPos;
  vec3 vWorldNormal = normalize(normal);
  vNormal = transpose(inverse(mat3(view))) * vWorldNormal;
  lightPos = lightTransform * vec4(pos, 1.0);
  vAlbedo = albedo;

  specularity = specRough.r;
  specularityExp = specRough.g;
  roughness = specRough.b;
}

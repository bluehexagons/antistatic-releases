#version 400

in vec3 vNormal;

in vec3 vAlbedo;

in float specularity;
in float specularityExp;
in float roughness;

in vec4 lightPos;

// out vec4 fragColor;
layout (location = 0) out vec3 specRough;
layout (location = 1) out vec3 albedo;
layout (location = 2) out vec3 normal;

void main(void) {
  albedo = vAlbedo.rgb;
  specRough = vec3(specularity, specularityExp, roughness);
  normal = vNormal * 0.5 + 0.5;
}

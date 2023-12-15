#version 400

uniform mat4 transform;
uniform mat4 lightTransform;

layout(location = 0) in vec3 pos;
layout(location = 1) in vec3 normal;

layout(location = 2) in vec4 albedo;
// layout(location = 3) in vec4 ambient;
// layout(location = 4) in vec4 specular;

out vec3 vWorldPos;
out vec3 vWorldNormal;
out vec3 vCameraNormal;

out vec4 vAlbedo;
// out vec4 vAmbient;
// out vec4 vSpecular;

out vec4 lightPos;
out float linearDepth;

// adapted from http://glampert.com/2014/01-26/visualizing-the-depth-buffer/
float LinearizeDepth(in float depth, in float zNear, in float zFar) {
  return (2.0 * zNear) / (zFar + zNear - depth * (zFar - zNear));
}

void main(void) {
  gl_Position = transform * vec4(pos, 1.0);
  vWorldPos = pos;
  vWorldNormal = normalize(normal);
  vCameraNormal = (transform * vec4(normal, 0.0)).xyz;
  lightPos = lightTransform * vec4(pos, 1.0);
  vAlbedo = albedo;
  // vAmbient = albedo;
  // vSpecular = albedo;
  linearDepth = 1.0 - max(0.2, LinearizeDepth(gl_Position.z, 0.1, 100.0));
}

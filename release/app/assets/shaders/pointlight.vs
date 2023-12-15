#version 400

uniform sampler2D depth;
uniform mat4 transform;
uniform mat4 lightTransform;
uniform mat4 view;
uniform mat4 projection;

layout(location = 0) in vec3 pos;
layout(location = 2) in vec4 albedo;
layout(location = 3) in vec4 center;
layout(location = 4) in vec4 props;

uniform sampler2D specRough;

out vec4 vAlbedo;
out vec4 vCenter;
out float size;
out vec3 viewCenter;
out vec4 viewPos;
out vec4 vProps;
out mat4 iprojection;

const vec4 igamma = vec4(1.0 / 2.2);

vec3 viewPosFromDepth(float depth, vec2 coord, mat4 iprojection) {
    float z = depth * 2.0 - 1.0;

    vec4 clipSpacePosition = vec4(coord * 2.0 - 1.0, z, 1.0);
    vec4 viewSpacePosition = iprojection * clipSpacePosition;

    // Perspective division
    viewSpacePosition /= viewSpacePosition.w;

    return viewSpacePosition.xyz;
}

void main(void) {
  float r = center.w;
  mat4 objectTransform = mat4(
    r, 0, 0, 0,
    0, r, 0, 0,
    0, 0, r, 0,
    center.x, center.y, center.z, 1
  );
  viewPos = view * objectTransform * vec4(pos, 1.0);
  gl_Position = projection * viewPos;
  vCenter = view * vec4(center.xyz, 1.0);
  size = r;
  vAlbedo = pow(albedo, igamma);
  vProps = props;
  iprojection = inverse(projection);

  // viewCenter = texture(position, (transform * vec4(center.xyz, 1.0)).xy * 2.0 - 1.0).xyz;
  vec2 coord = (transform * vec4(center.xyz, 1.0)).xy * 2.0 - 1.0;
  float depth = texture(depth, coord).r;
  viewCenter = viewPosFromDepth(depth, coord, iprojection);
}

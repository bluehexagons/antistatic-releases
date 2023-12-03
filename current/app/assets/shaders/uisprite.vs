#version 400

uniform mat4 uiTransform;

layout(location = 0) in vec3 pos;
layout(location = 1) in vec2 texCoord;
layout(location = 2) in vec4 color;

out vec3 vPosition;
out vec2 vTexCoord;
out vec4 vColor;

void main(void) {
  vPosition = pos;
  vec4 p = uiTransform * vec4(pos, 1.0);
  gl_Position = vec4(p.x + 1.0, p.y - 1.0, p.z, p.w);
  vTexCoord = texCoord;
  vColor = color;
  // vColor = vec4(color.rgb, 1.0);
  // vColor = vec4(texCoord.x, texCoord.y, 0.0, 1.0);
}

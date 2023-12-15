#version 400
// Uses raw world coordinates

layout(location = 0) in vec3 pos;
layout(location = 1) in vec2 texCoord;

uniform mat4 view;
uniform mat4 lightTransform;

out vec2 vTexCoord;

out mat4 iview;
out mat4 tview;
out mat4 tilight;

void main(void) {
  gl_Position = vec4(pos, 1.0);
  vTexCoord = texCoord;

  tview = transpose(view);
  iview = inverse(view);
  tilight = transpose(inverse(lightTransform));
}

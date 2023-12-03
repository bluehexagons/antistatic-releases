#version 400
// Uses raw world coordinates

layout(location = 0) in vec3 pos;
layout(location = 1) in vec2 texCoord;

uniform mat4 view;
uniform mat4 lightTransform;
uniform mat4 projection;

out vec2 vTexCoord;

out mat4 iview;
out mat4 tview;
out mat4 tilight;
out mat4 iprojection;

void main(void) {
  gl_Position = vec4(pos, 1.0);
  vTexCoord = texCoord;

  tview = transpose(view);
  iview = inverse(view);
  iprojection = inverse(projection);
  tilight = transpose(inverse(lightTransform));
}

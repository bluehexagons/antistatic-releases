#version 400

uniform mat4 lightTransform;
layout(location = 0) in vec3 pos;

void main(void) {
  gl_Position = lightTransform * vec4(pos, 1.0);
}

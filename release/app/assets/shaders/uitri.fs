#version 400

in vec3 vPosition;
in vec4 vColor;

out vec4 fragColor;

void main(void) {
  fragColor = vColor.rgba;
}

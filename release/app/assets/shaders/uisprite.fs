#version 400

uniform sampler2DRect sprites;

in vec3 vPosition;
in vec2 vTexCoord;
in vec4 vColor;

out vec4 fragColor;

void main(void) {
  fragColor = texture(sprites, vTexCoord) * vColor;
}

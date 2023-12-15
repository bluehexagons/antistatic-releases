#version 400

out vec4 fragColor;

void main(void) {
  fragColor = vec4(gl_FragCoord.w, 0, 0, 1);
}

#version 400
out vec4 fragColor;

uniform mat4 lightTransform;
uniform mat4 transform;
uniform mat4 view;
uniform mat4 projection;

uniform sampler2D sdr;
uniform sampler2D depth;
uniform sampler2D specRough;
uniform sampler2D albedo;
uniform sampler2D normals;

in vec2 vTexCoord;

uniform vec2 viewportSize;

uniform float noiseTile[16];

const int useFXAA = 1;
// Took this, unknown source: https://stackoverflow.com/questions/12105330/how-does-this-simple-fxaa-work
// then read this (linked on page): http://developer.download.nvidia.com/assets/gamedev/files/sdk/11/FXAA_WhitePaper.pdf
float fxaaLuma(vec2 rg) {
 return rg.y * (0.587/0.299) + rg.x;
}
vec3 fxaa(vec2 texCoords) {
  float FXAA_SPAN_MAX = 8.0;
  float FXAA_REDUCE_MUL = 1.0/8.0;
  float FXAA_REDUCE_MIN = 1.0/128.0;

  vec2 rgbNW = texture2D(sdr, texCoords + (vec2(-1.0, -1.0) / viewportSize)).xy;
  vec2 rgbNE = texture2D(sdr, texCoords + (vec2(1.0, -1.0) / viewportSize)).xy;
  vec2 rgbSW = texture2D(sdr, texCoords + (vec2(-1.0, 1.0) / viewportSize)).xy;
  vec2 rgbSE = texture2D(sdr, texCoords + (vec2(1.0, 1.0) / viewportSize)).xy;
  vec2 rgbM = texture2D(sdr, texCoords).xy;

  vec3 luma = vec3(0.299, 0.587, 0.114);
  float lumaNW = fxaaLuma(rgbNW);
  float lumaNE = fxaaLuma(rgbNE);
  float lumaSW = fxaaLuma(rgbSW);
  float lumaSE = fxaaLuma(rgbSE);
  float lumaM  = fxaaLuma(rgbM);

  float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
  float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

  vec2 dir;
  dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
  dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));

  float dirReduce = max(
    (lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL),
    FXAA_REDUCE_MIN
  );

  float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);

  dir = min(
      vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX),
      max(
        vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),
        dir * rcpDirMin
      )
    )
    / viewportSize;

  vec3 rgbA = (1.0/2.0) * (
    texture2D(sdr, texCoords.xy + dir * (1.0/3.0 - 0.5)).xyz
    + texture2D(sdr, texCoords.xy + dir * (2.0/3.0 - 0.5)).xyz);
  vec3 rgbB = rgbA * (1.0/2.0) + (1.0/4.0) * (
    texture2D(sdr, texCoords.xy + dir * (0.0/3.0 - 0.5)).xyz
    + texture2D(sdr, texCoords.xy + dir * (3.0/3.0 - 0.5)).xyz);
  float lumaB = fxaaLuma(rgbB.xy);

  if ((lumaB < lumaMin) || (lumaB > lumaMax)) {
    return rgbA;
  } else {
    return rgbB;
  }
}

/*
  0 -- disabled
  1 -- FXAA
*/
uniform int antialias;

void main(void) {
  vec3 c = antialias == useFXAA
    ? fxaa(vTexCoord)
    : texture2D(sdr, vTexCoord).xyz;

  fragColor = vec4(c, 1.0);

  // fragColor = vec4(1.0, 0.0, 0.0, 1.0);
}

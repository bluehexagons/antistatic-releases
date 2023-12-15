How mtl files are translated into material properties, because I don't feel like doing this the right way:

-- Specular highlight (exponent) - stored as a percentage of 127, 1 byte
Ns 16.0
-- ignored, currently
Ka 0.300000 0.100000 0.100000
-- Used for albedo (3 bytes)
Kd 0.530000 0.290000 0.290000
-- R value is used for specular intensity - stored as a percentage of 8, 1 byte
Ks 0.400000 0.0 0.0
-- unused
Ke 0.000000 0.000000 0.000000
-- unused
Ni 1.000000
-- unused, currently, but may be used for opacity later?
d 0.500000
-- unused
illum 2

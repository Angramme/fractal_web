# Web fractal renderer

> this project is the web version of [fractal_viewer](https://github.com/Angramme/fractal_viewer)

Multiple fractals are present: 
- jerusalemn cube
- koch curve
- menger sponge.

  
Custom renderer was implemented using ray marching. One cool trick used is to stop the recursive function when the on screen size of the homothety reaches a certain threshold. Multiple symmetries were also exploited to improve performance. 

From Graphics side, a simple Phong light model is used with ray-marched multi-reflections. Glow was also implemented using the closest observed distance for non-intersection points. 

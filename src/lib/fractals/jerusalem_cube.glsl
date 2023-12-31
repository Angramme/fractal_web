float sdBox( vec3 p, vec3 b )
{
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

// #define vB 0.38
// #define vB 0.42
// parameter static int iterations = 2 [0, 20];
parameter static float cube_ratio = 0.4 [0., 1.0];

#define MAX_ITER_JER 30
#define vB cube_ratio
// #define vB (2.0/5.)
#define vA (1.-2.*vB)

#export vec4 IFS(vec3 P, float min_detail){
    float S = 2.;
    P *= .5;

    // vec3 color = mix(vec3(1, 0.5, 0.5), vec3(0.5, 0.5, 1), cos(1.6+P.y*30.)*0.5+0.5);

    // vec3 color = vec3(1, 0.5, 0.5);
    // if(P.y < 0.) color = vec3(0.5, 0.5, 1);

    for(int i=0; i<MAX_ITER_JER; i++){
        // break if we reached the desired LOD
        if(S <= 2.*min_detail) break;
        
        // reduce the problem to one single symmetry
        P = abs(P);
        if(P.x < P.z) P.xz = P.zx;
        if(P.y < P.z) P.zy = P.yz;
        if(P.x < P.y) P.xy = P.yx;
        //*

        if(P.z > .5*vA || P.z > P.y + 3./2.*vA-.5){
            // it's the bigger cube
            P -= vec3(.5-.5*vB);
            P *= 1./vB;
            S *= vB;
        }else{
            // it's the smaller cube
            P -= vec3(vec2(.5-.5*vA), 0);
            P *= 1./vA;
            S *= vA;
        }

    }

    // calcule the cube distance...
    float cube = sdBox(P, vec3(.5))*S;

    return vec4(cube, vec3(1, 1, .5));
    // return vec4(cube, color);
}
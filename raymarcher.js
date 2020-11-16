"use strict";

const NUM_SHAPE_MAX = 16;
const SHAPE_TYPE_WALL = 0;
const SHAPE_TYPE_SPHERE = 1;
const SHAPE_TYPE_CYLINDER = 2;
const SHAPE_TYPE_TORUS = 3;

var cameraPosition = [ 0.0, 0.0, -1.0 ];
var wallOffset = 1.1;

var gl_shapes = [
    {
	    type: SHAPE_TYPE_WALL,
	    va: [ 0.0, -wallOffset, 0.0 ],
	    vb: [ 0.0, 1.0, 0.0 ],
	    fa: 0.0, // UNUSED
	    fb: 0.0, // UNUSED
	    col: [ 0.1, 0.1, 0.1 ],
	    ref: [ 0.1, 0.1, 0.1 ],
	    f0: 0.8,
    },
    {
	    type: SHAPE_TYPE_WALL,
	    va: [ 0.0, wallOffset, 0.0 ],
	    vb: [ 0.0, -1.0, 0.0 ],
	    fa: 0.0, // UNUSED
	    fb: 0.0, // UNUSED
	    col: [ 0.5, 0.5, 0.5 ],
	    ref: [ 0.4, 0.4, 0.4 ],
	    f0: 0.8,
    },
    {
	    type: SHAPE_TYPE_WALL,
	    va: [ -wallOffset, 0.0, 0.0 ],
	    vb: [ 1.0, 0.0, 0.0 ],
	    fa: 0.0, // UNUSED
	    fb: 0.0, // UNUSED
	    col: [ 0.5, 0.5, 0.8 ],
	    ref: [ 0.5, 0.5, 0.8 ],
	    f0: 0.8,
    },
    {
	    type: SHAPE_TYPE_WALL,
	    va: [ wallOffset, 0.0, 0.0 ],
	    vb: [ -1.0, 0.0, 0.0 ],
	    fa: 0.0, // UNUSED
	    fb: 0.0, // UNUSED
	    col: [ 0.25, 0.5, 0.25 ],
	    ref: [ 0.25, 0.5, 0.25 ],
	    f0: 0.8,
    },
    {
	    type: SHAPE_TYPE_WALL,
	    va: [ 0.0, 0.0, -2.0 ],
	    vb: [ 0.0, 0.0, 1.0 ],
	    fa: 0.0, // UNUSED
	    fb: 0.0, // UNUSED
	    col: [ 2.0, 2.0, 2.0 ],
	    ref: [ 0.1, 0.1, 0.1 ],
	    f0: 0.8,
    },

    {
	    type: SHAPE_TYPE_SPHERE,
	    va: [ -0.8, 0.7, 2.2 ],
	    vb: [ 0.0, 0.0, 0.0 ], // UNUSED
	    fa: 0.3,
	    fb: 0.0, // UNUSED
	    col: [ 0.0, 0.0, 0.0 ],
	    ref: [ 0.9, 0.9, 0.9 ],
	    f0: 0.8,
    },
    {
	    type: SHAPE_TYPE_SPHERE,
	    va: [ 0.8, 0.9, 2.9 ],
	    vb: [ 0.0, 0.0, 0.0 ], // UNUSED
	    fa: 0.2,
	    fb: 0.0, // UNUSED
	    col: [ 0.0, 0.0, 0.0 ],
	    ref: [ 0.9, 0.9, 0.9 ],
	    f0: 0.8,
    },
    {
	    type: SHAPE_TYPE_SPHERE,
	    va: [ 0.4, -0.3, 2.2 ],
	    vb: [ 0.0, 0.0, 0.0 ], // UNUSED
	    fa: 0.18,
	    fb: 0.0, // UNUSED
	    col: [ 0.0, 0.0, 0.0 ],
	    ref: [ 0.9, 0.9, 0.9 ],
	    f0: 0.8,
    },

    {
	    type: SHAPE_TYPE_CYLINDER,
	    va: [ -0.6, -0.7, 3.2 ],
	    vb: [ 0.0, 0.7, 1.8 ],
	    fa: 0.1,
	    fb: 0.0, // UNUSED
	    col: [ 0.0, 0.0, 0.0 ],
	    ref: [ 0.99, 0.99, 0.99 ],
	    f0: 0.8,
    },
    {
	    type: SHAPE_TYPE_CYLINDER,
	    va: [ 0.0, 0.7, 1.8 ],
	    vb: [ 0.9, -0.9, 0.4 ],
	    fa: 0.05,
	    fb: 0.0, // UNUSED
	    col: [ 0.0, 0.0, 0.0 ],
	    ref: [ 0.99, 0.99, 0.99 ],
	    f0: 0.8,
    },
    {
	    type: SHAPE_TYPE_CYLINDER,
	    va: [ 0.9, -0.9, 0.4 ],
	    vb: [ -0.6, 0.1, -0.5 ],
	    fa: 0.025,
	    fb: 0.0, // UNUSED
	    col: [ 0.0, 0.0, 0.0 ],
	    ref: [ 0.99, 0.99, 0.99 ],
	    f0: 0.8,
    },

    {
	    type: SHAPE_TYPE_TORUS,
	    va: [ -0.1, 0.0, 1.8 ],
	    vb: [ 0.4, 0.0, 0.4 ],
	    fa: 0.3,
	    fb: 0.1,
	    col: [ 0.7, 0.1, 0.1 ],
	    ref: [ 0.1, 0.1, 0.1 ],
	    f0: 0.8,
    },
];

var max_iter = 4.0;


//// Render view
const vsSource =
	`#version 300 es

	precision highp float;

	in vec4 vertexPosition;
	in vec3 vertexTextureCoord;

	out vec3 vTextureCoord;

	void main(void) {
		gl_Position = vertexPosition;
		vTextureCoord = vertexTextureCoord;
	}
`;
// Fragment shader program
const fsSource =
	`#version 300 es
	#define M_PI 3.1415926535897932384626433832795
	#define NUM_SHAPE_MAX 16
	#define MAX_ITER_MARCHING 150

	#define SHAPE_TYPE_WALL 0
	#define SHAPE_TYPE_SPHERE 1
	#define SHAPE_TYPE_CYLINDER 2
	#define SHAPE_TYPE_TORUS 3

	precision highp float;

	struct Shape {
		int type;
		vec3 va;
		vec3 vb;
		float fa;
		float fb;

		vec3 col;
		vec3 ref;
		float f0;
	};

	struct TraceData {
		vec3 pos;
		vec3 dir;
		vec3 col;
		vec3 reflection;
	};

	const vec3 dx = vec3(1.0E-6, 0.0, 0.0);
	const vec3 dy = vec3(0.0, 1.0E-6, 0.0);
	const vec3 dz = vec3(0.0, 0.0, 1.0E-6);



	uniform float seed;
	uniform sampler2D texture;
	uniform mat3 textureMatrix;
	uniform vec3 cameraPosition;
	uniform float max_iter;

	// Using struct makes compiling time very long
	uniform int numberOfShapes;
	uniform int shape_type[NUM_SHAPE_MAX];
	uniform vec3 shape_va[NUM_SHAPE_MAX];
	uniform vec3 shape_vb[NUM_SHAPE_MAX];
	uniform float shape_fa[NUM_SHAPE_MAX];
	uniform float shape_fb[NUM_SHAPE_MAX];
	uniform vec3 shape_col[NUM_SHAPE_MAX];
	uniform vec3 shape_ref[NUM_SHAPE_MAX];
	uniform float shape_f0[NUM_SHAPE_MAX];

	float exposure = 1.08;
	float no_fog = 0.9; // probability of rays not hit particle in the air

	in vec3 vTextureCoord;

	out vec4 fragmentColor;

	float random(vec2 v) {
		return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453);
	}

	float d_intersection(float shape0, float shape1)
	{
		return max(shape0, shape1);
	}

	float d_union(float shape0, float shape1)
	{
		return min(shape0, shape1);
	}

	// Calculate shape0 - shape1
	// args:
	//     shape0: distance of the base shape
	//     shape1: distance of the subtract shape
	float d_diff(float shape0, float shape1)
	{
		return max(shape0, -shape1);
	}

	// args:
	//     pos: position of center of the wall
	//     dir: direction of surface norm of the wall (should be normalized)
	//     ray: current position of the ray
	float d_plane(vec3 pos, vec3 dir, vec3 pos_ray)
	{
		return dot(pos_ray - pos, normalize(dir));
	}

	// args:
	//     pos: position of center of the sphere
	//     ray: current position of the ray
	float d_sphere(vec3 pos, float r, vec3 pos_ray)
	{
		return length(pos - pos_ray) - r;
	}

	// args:
	//     sp: position of start edge of the cylinder
	//     ep: position of end edge of the cylinder
	//     ray: current position of the ray
	float d_cylinder(vec3 sp, vec3 ep, float r, vec3 pos_ray)
	{
		vec3 mid = (sp + ep) * 0.5;
		float lh = length(ep - mid);
		vec3 a = normalize(ep - sp);
		float v = dot(a, pos_ray - mid);
		vec3 n = normalize(pos_ray - mid - v * a);
		float d = mix(
			length(pos_ray - mid - v * a) - r,
			mix(max(dot(sp - pos_ray, a), dot(pos_ray - ep, a)),
			    min(length(sp + n * r - pos_ray), length(pos_ray - ep - n * r)),
			    step(r, dot(pos_ray - sp, n))),
			step(lh, abs(v)));

		return d;
	}

	// args:
	//     c: position of center of the torus
	//     a: axis of the torus
	//     ra: radius of the torus center
	//     rb: radius of the torus tube
	//     ray: current position of the ray
	float d_torus(vec3 c, vec3 a, float ra, float rb, vec3 pos_ray)
	{
		a = normalize(a);
		vec3 p = pos_ray - c;
		vec3 p_r = normalize(p - dot(p, a) * a);
		return length(p - ra * p_r) - rb;
	}

	// args:
	//     origin: start point of ray
	//     ray: direction of ray (should be normalized)
	TraceData traceRay(TraceData ray, const float iter) {
		const float d_ep = 1.0E-6;

		for (int i = 0; i < MAX_ITER_MARCHING; ++i) {
			float d; // temporary distance between current ray position and objects
			float d_min = 1000.0;
			int hit = -1;

			for (int k = 0; k < min(numberOfShapes, NUM_SHAPE_MAX); ++k) {
				if (shape_type[k] == SHAPE_TYPE_WALL) {
					////
					// wall hit
					////
					d = d_plane(shape_va[k], shape_vb[k], ray.pos);
				} else if (shape_type[k] == SHAPE_TYPE_SPHERE) {
					////
					// sphere hit
					////
					d = d_sphere(shape_va[k], shape_fa[k], ray.pos);
				} else if (shape_type[k] == SHAPE_TYPE_CYLINDER) {
					////
					// cylinder hit
					////
					d = d_cylinder(shape_va[k], shape_vb[k], shape_fa[k], ray.pos);
				} else if (shape_type[k] == SHAPE_TYPE_TORUS) {
					////
					// torus hit
					////
					d = d_torus(shape_va[k], shape_vb[k], shape_fa[k], shape_fb[k], ray.pos);
				}
				d_min = min(d, d_min);
				if (d < d_ep) {
					hit = k;
				}
			}

			// Forward ray
			ray.pos += ray.dir * d_min;

			// Add fog
			ray.col += vec3(0.10, 0.10, 0.17) * ray.reflection * d_min * abs(random(vec2(seed, ray.pos.x + ray.pos.y + ray.pos.z)));

			if (hit >= 0) {
				// Reflect
				vec3 norm;
				if (shape_type[hit] == SHAPE_TYPE_WALL) {
					// Get normal vector
					norm.x = d_plane(shape_va[hit], shape_vb[hit], ray.pos + dx) - d_plane(shape_va[hit], shape_vb[hit], ray.pos - dx);
					norm.y = d_plane(shape_va[hit], shape_vb[hit], ray.pos + dy) - d_plane(shape_va[hit], shape_vb[hit], ray.pos - dy);
					norm.z = d_plane(shape_va[hit], shape_vb[hit], ray.pos + dz) - d_plane(shape_va[hit], shape_vb[hit], ray.pos - dz);

					norm = normalize(norm);

				} else if (shape_type[hit] == SHAPE_TYPE_SPHERE) {
					// Get normal vector
					norm.x = d_sphere(shape_va[hit], shape_fa[hit], ray.pos + dx) - d_sphere(shape_va[hit], shape_fa[hit], ray.pos - dx);
					norm.y = d_sphere(shape_va[hit], shape_fa[hit], ray.pos + dy) - d_sphere(shape_va[hit], shape_fa[hit], ray.pos - dy);
					norm.z = d_sphere(shape_va[hit], shape_fa[hit], ray.pos + dz) - d_sphere(shape_va[hit], shape_fa[hit], ray.pos - dz);

					norm = normalize(norm);

				} else if (shape_type[hit] == SHAPE_TYPE_CYLINDER) {
					// Get normal vector
					norm.x = d_cylinder(shape_va[hit], shape_vb[hit], shape_fa[hit], ray.pos + dx) - d_cylinder(shape_va[hit], shape_vb[hit], shape_fa[hit], ray.pos - dx);
					norm.y = d_cylinder(shape_va[hit], shape_vb[hit], shape_fa[hit], ray.pos + dy) - d_cylinder(shape_va[hit], shape_vb[hit], shape_fa[hit], ray.pos - dy);
					norm.z = d_cylinder(shape_va[hit], shape_vb[hit], shape_fa[hit], ray.pos + dz) - d_cylinder(shape_va[hit], shape_vb[hit], shape_fa[hit], ray.pos - dz);

					norm = normalize(norm);

				} else if (shape_type[hit] == SHAPE_TYPE_TORUS) {
					norm.x = d_torus(shape_va[hit], shape_vb[hit], shape_fa[hit], shape_fb[hit], ray.pos + dx) - d_torus(shape_va[hit], shape_vb[hit], shape_fa[hit], shape_fb[hit], ray.pos - dx);
					norm.y = d_torus(shape_va[hit], shape_vb[hit], shape_fa[hit], shape_fb[hit], ray.pos + dy) - d_torus(shape_va[hit], shape_vb[hit], shape_fa[hit], shape_fb[hit], ray.pos - dy);
					norm.z = d_torus(shape_va[hit], shape_vb[hit], shape_fa[hit], shape_fb[hit], ray.pos + dz) - d_torus(shape_va[hit], shape_vb[hit], shape_fa[hit], shape_fb[hit], ray.pos - dz);

					norm = normalize(norm);
				}

				// Reflect the ray
				ray.dir = reflect(ray.dir, norm);
				ray.pos += ray.dir * d_ep * 10.0;

				// Color
				ray.col += ray.reflection * shape_col[hit];
				ray.reflection = ray.reflection * shape_ref[hit] * vec3(mix(
				    shape_f0[hit] + (1.0 - shape_f0[hit]) * pow(1.0 - dot(ray.dir, norm), 5.0),
				    shape_f0[hit] * dot(ray.dir, norm),
				    step(1.0, iter)));
			}
		}
		ray.col = clamp(ray.col, 0.0, 2.0);
		return ray;
	}

	void main(void) {
		vec3 color = vec3(0.0);

		{
			TraceData ray;
			ray.pos = cameraPosition;
			ray.dir = normalize(vTextureCoord);
			ray.col = vec3(0.0);
			ray.reflection = vec3(1.0);
			// Marching
			ray = traceRay(ray, 0.0);
			// Get color
			color = ray.col;
		}

		fragmentColor = vec4(clamp(exposure * color, 0.0, 1.0), 1.0);
	}
`;



////////////////////////////////////////////////////////////////
//
//        GUI params
//
////////////////////////////////////////////////////////////////
var touchPointCount_prev = 0;
var touchDistance_prev = 0;
var touchCenter_prev = { x: 0, y: 0 };

////////////////////////////////////////////////////////////////
//
//        Initialize
//
////////////////////////////////////////////////////////////////
window.onload = init;

function init() {
	// Initialize HTML
	// Event
	window.addEventListener(
		"keydown",
		(e) => {
			e.preventDefault();
			e.stopPropagation();

			if (event.key === 'w') {
				cameraPosition[2] += 0.05;
			} else if(event.key === 'a') {
				cameraPosition[0] -= 0.05;
			} else if(event.key === 's') {
				cameraPosition[2] -= 0.05;
			} else if(event.key === 'd') {
				cameraPosition[0] += 0.05;
			}
		});
	const canvas = document.getElementById('glcanvas');
	canvas.addEventListener(
		"touchstart",
		(e) => {
			e.preventDefault();
			e.stopPropagation();

			if (e.touches.length >= 2) {
				// Distance
				let d = Math.sqrt(
					Math.pow(e.touches[0].clientX - e.touches[1].clientX, 2) +
					Math.pow(e.touches[0].clientY - e.touches[1].clientY, 2));
				touchDistance_prev = d;

				// Center
				let x_c = (e.touches[0].clientX - e.touches[1].clientX) / 2.0;
				let y_c = (e.touches[0].clientY - e.touches[1].clientY) / 2.0;
				touchCenter_prev.x = x_c;
				touchCenter_prev.y = y_c;
			} else {
				// Distance
				touchDistance_prev = 0;

				// Center
				touchCenter_prev.x = e.touches[0].clientX;
				touchCenter_prev.y = e.touches[0].clientY;
			}
			touchPointCount_prev = e.touches.length;
		});
	canvas.addEventListener(
		"touchmove",
		(e) => {
			e.preventDefault();
			e.stopPropagation();

			if (e.touches.length >= 2) {
				// Distance
				let d = Math.sqrt(
					Math.pow(e.touches[0].clientX - e.touches[1].clientX, 2) +
					Math.pow(e.touches[0].clientY - e.touches[1].clientY, 2));
				if (touchPointCount_prev) {
					cameraPosition[2] += 0.05 * (d - touchDistance_prev);
				}
				touchDistance_prev = d;

				// Center
				let x_c = (e.touches[0].clientX - e.touches[1].clientX) / 2.0;
				let y_c = (e.touches[0].clientY - e.touches[1].clientY) / 2.0;
				if (touchPointCount_prev) {
					cameraPosition[0] += 0.05 * (x_c - touchCenter_prev.x);
					cameraPosition[1] += 0.05 * (y_c - touchCenter_prev.y);
				}
				touchCenter_prev.x = x_c;
				touchCenter_prev.y = y_c;
			} else {
				// Distance
				touchDistance_prev = 0;

				// Center
				touchCenter_prev.x = e.touches[0].clientX;
				touchCenter_prev.y = e.touches[0].clientY;
			}
			touchPointCount_prev = e.touches.length;
		});

	// WebGL
	// max iteration count
	const max_iterInput = document.getElementById("maxIterationCount");
	max_iterInput.value = max_iter;
	max_iterInput.addEventListener(
	    "change",
	    function () {
		    max_iter = parseFloat(max_iterInput.value);
		    if (max_iter < 1.0) {
			    max_iter = 1.0;
		    }
	    });
	const max_iterInputIncrement = document.getElementById("maxIterationCountInc");
	const max_iterIncrementer = () => { max_iter = parseFloat(max_iterInput.value) + 1.0; max_iterInput.value = max_iter; };
	max_iterInputIncrement.addEventListener("mousedown", max_iterIncrementer);
	max_iterInputIncrement.addEventListener("touchstart", max_iterIncrementer);
	const max_iterInputDecrement = document.getElementById("maxIterationCountDec");
	const max_iterDecrementer = () => { max_iter = Math.max(parseFloat(max_iterInput.value) - 1.0, 1.0); max_iterInput.value = max_iter; };
	max_iterInputDecrement.addEventListener("mousedown", max_iterDecrementer);
	max_iterInputDecrement.addEventListener("touchstart", max_iterDecrementer);

	// Start WebGL
	glmain();
}




function glmain() {
	const canvas = document.getElementById('glcanvas');

	// Get WebGL instance
	const gl = canvas.getContext('webgl2', { antialias: true });
	// If we don't have a GL context, give up now
	if (!gl) {
		alert('Unable to initialize WebGL. Your browser or machine may not support it.');
		return;
	}

	// Initialize a shader program; this is where all the lighting
	// for the vertices and so forth is established.
	console.log("compile shader program...");
	const renderShaderProgram = initShaderProgram(gl, vsSource, fsSource);
	console.log("done.");

	// Collect all the info needed to use the shader program.
	// Look up which attributes our shader program is using
	// for aVertexPosition, aVevrtexColor and also
	// look up uniform locations.
	let tmpArr = new Array(NUM_SHAPE_MAX);
	for (let i = 0; i < tmpArr.length; ++i) {
		tmpArr[i] = i;
	}
	const renderProgramInfo = {
		shaderProgram: renderShaderProgram,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(renderShaderProgram, 'vertexPosition'),
			vertexTextureCoord: gl.getAttribLocation(renderShaderProgram, 'vertexTextureCoord'),
		},
		uniformLocations: {
			seed: gl.getUniformLocation(renderShaderProgram, 'seed'),
			texture: gl.getUniformLocation(renderShaderProgram, 'texture'),
			textureMatrix: gl.getUniformLocation(renderShaderProgram, 'textureMatrix'),
			cameraPosition: gl.getUniformLocation(renderShaderProgram, 'cameraPosition'),
			numberOfShapes: gl.getUniformLocation(renderShaderProgram, 'numberOfShapes'),
			shapes: tmpArr.map((x, ind) => {
				return {
					type: gl.getUniformLocation(renderShaderProgram, 'shape_type[' + ind + ']'),
					va: gl.getUniformLocation(renderShaderProgram, 'shape_va[' + ind + ']'),
					vb: gl.getUniformLocation(renderShaderProgram, 'shape_vb[' + ind + ']'),
					fa: gl.getUniformLocation(renderShaderProgram, 'shape_fa[' + ind + ']'),
					fb: gl.getUniformLocation(renderShaderProgram, 'shape_fb[' + ind + ']'),
					col: gl.getUniformLocation(renderShaderProgram, 'shape_col[' + ind + ']'),
					ref: gl.getUniformLocation(renderShaderProgram, 'shape_ref[' + ind + ']'),
					f0: gl.getUniformLocation(renderShaderProgram, 'shape_f0[' + ind + ']'),
				};
			}),
			max_iter: gl.getUniformLocation(renderShaderProgram, 'max_iter'),
			max_bound: gl.getUniformLocation(renderShaderProgram, 'max_bound'),
		},
	};

	const screen = createScreen();
	const screenBuffers = createVBO(gl, screen);
	const textures = createTexture(gl);

	// Draw the scene repeatedly
	let count = 0;
	function render(now) {
		// Move cmaera
		cameraPosition[1] = Math.sin(2.0 * Math.PI * count / 137) * 0.05;
		// Rotate the torus
		gl_shapes[gl_shapes.length - 1].vb = [
			Math.sin(2.0 * Math.PI * count / 200),
			0.0,
			Math.cos(2.0 * Math.PI * count / 200),
			];

		++count;
		drawScene(gl, renderProgramInfo, textures, screenBuffers);

		requestAnimationFrame(render);
	}
	requestAnimationFrame(render);
}


function createScreen() {
	const positions = [
		-1.0, -1.0,  0.0,
		 1.0, -1.0,  0.0,
		 1.0,  1.0,  0.0,
		-1.0,  1.0,  0.0,
	];

	const indices = [
		0, 1, 2, 0, 2, 3,
	];

	const texcoords = [
		-1.0, -1.0, 1.0,
		 1.0, -1.0, 1.0,
		 1.0,  1.0, 1.0,
		-1.0,  1.0, 1.0,
	];

	return {
		positions: positions,
		texcoords: texcoords,
		indices: indices,
	};
}

function createVBO(gl, data) {
	// Bind buffers
	let positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(data.positions),
			gl.STATIC_DRAW);

	let texcoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array(data.texcoords),
		gl.STATIC_DRAW);

	let indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(
		gl.ELEMENT_ARRAY_BUFFER,
		new Uint16Array(data.indices),
		gl.STATIC_DRAW);

	return {
		positions: {
			data: positionBuffer,
			numComponents: 3,
			type: gl.FLOAT,
			normalize: false,
		},
		texcoords: {
			data: texcoordBuffer,
			numComponents: 3,
			type: gl.FLOAT,
			normalize: false,
		},
		indices: indexBuffer,
		vertexCount: data.indices.length,
	};
}

function createTexture(gl) {
	//const img = document.getElementById("textureImage");

	const tx = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tx);
	//gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1024, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	return [tx];
}

function initShaderProgram(gl, vsSource, fsSource) {
	let vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
	let fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

	let shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Unable to initialize the shader program: " + gl.getProgramInfoLog(shaderProgram));
		return null;
	}
	return shaderProgram;
}

function loadShader(gl, type, source) {
	let shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert("Failed to compile the shader program: " + gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

function drawScene(gl, renderProgramInfo, textures, screenBuffers)
{
	////////////////////////////////////////////////////////////////
	// Render
	////////////////////////////////////////////////////////////////
	gl.useProgram(renderProgramInfo.shaderProgram);

	gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear with black
	gl.clearDepth(1.0); // Clear everything
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DETPH_BUFFER_BIT);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, textures[0]);

	const textureMatrix = createIdenticalMat3();
	textureMatrix[0] = 0.5; textureMatrix[4] = -0.5; // Scale
	textureMatrix[6] = 0.5; textureMatrix[7] = 0.5; // Shift

	gl.uniform1f(
	    renderProgramInfo.uniformLocations.seed,
	    Math.random() * 10.0);
	gl.uniform1i(
	    renderProgramInfo.uniformLocations.texture,
	    0);
	gl.uniformMatrix3fv(
	    renderProgramInfo.uniformLocations.textureMatrix,
	    false,
	    textureMatrix);
	gl.uniform3fv(
	    renderProgramInfo.uniformLocations.cameraPosition,
	    cameraPosition);
	gl.uniform1i(
	    renderProgramInfo.uniformLocations.numberOfShapes,
	    gl_shapes.length);
	gl.uniform1f(
	    renderProgramInfo.uniformLocations.max_iter,
	    max_iter);
	for (let i = 0; i < gl_shapes.length; ++i) {
		gl.uniform1i(
		    renderProgramInfo.uniformLocations.shapes[i].type,
		    gl_shapes[i].type);
		gl.uniform3fv(
		    renderProgramInfo.uniformLocations.shapes[i].va,
		    gl_shapes[i].va);
		gl.uniform3fv(
		    renderProgramInfo.uniformLocations.shapes[i].vb,
		    gl_shapes[i].vb);
		gl.uniform1f(
		    renderProgramInfo.uniformLocations.shapes[i].fa,
		    gl_shapes[i].fa);
		gl.uniform1f(
		    renderProgramInfo.uniformLocations.shapes[i].fb,
		    gl_shapes[i].fb);
		gl.uniform3fv(
		    renderProgramInfo.uniformLocations.shapes[i].col,
		    gl_shapes[i].col);
		gl.uniform3fv(
		    renderProgramInfo.uniformLocations.shapes[i].ref,
		    gl_shapes[i].ref);
		gl.uniform1f(
		    renderProgramInfo.uniformLocations.shapes[i].f0,
		    gl_shapes[i].f0);
	}

	enableAttribute(gl, renderProgramInfo.attribLocations, screenBuffers);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, screenBuffers.indices);
	gl.drawElements(gl.TRIANGLES, screenBuffers.vertexCount, gl.UNSIGNED_SHORT, 0);
}

function enableAttribute(gl, locations, buffers) {
	let stride = 0;
	let offset = 0;
	// Positions
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positions.data);
		gl.vertexAttribPointer(
			locations.vertexPosition,
			buffers.positions.numComponents,
			buffers.positions.type,
			buffers.positions.normalize,
			stride,
			offset);
		gl.enableVertexAttribArray(locations.vertexPosition);
	}
	// Texture Coords
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texcoords.data);
		gl.vertexAttribPointer(
			locations.vertexTextureCoord,
			buffers.texcoords.numComponents,
			buffers.texcoords.type,
			buffers.texcoords.normalize,
			stride,
			offset);
		gl.enableVertexAttribArray(locations.vertexTextureCoord);
	}
}

function createIdenticalMat3() {
	let A = new Array(9);
	A[0] = 1.0; A[3] = 0.0; A[6] = 0.0;
	A[1] = 0.0; A[4] = 1.0; A[7] = 0.0;
	A[2] = 0.0; A[5] = 0.0; A[8] = 1.0;
	return A;
}

function createIdenticalMat4() {
	let A = new Array(16);
	A[0] = 1.0; A[4] = 0.0; A[8]  = 0.0; A[12] = 0.0;
	A[1] = 0.0; A[5] = 1.0; A[9]  = 0.0; A[13] = 0.0;
	A[2] = 0.0; A[6] = 0.0; A[10] = 1.0; A[14] = 0.0;
	A[3] = 0.0; A[7] = 0.0; A[11] = 0.0; A[15] = 1.0;
	return A;
}


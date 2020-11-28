"use strict";

const DIMENSION_NUM_3 = 3;
const DIMENSION_NUM_3_X = 0;
const DIMENSION_NUM_3_Y = 1;
const DIMENSION_NUM_3_Z = 2;

const NUM_SHAPE_MAX = 16;
const SHAPE_TYPE_NULL = -1;
const SHAPE_TYPE_WALL = 0;
const SHAPE_TYPE_SPHERE = 1;
const SHAPE_TYPE_CYLINDER = 2;
const SHAPE_TYPE_TORUS = 3;
const SHAPE_TYPE_NAME = [
    "wall",
    "sphere",
    "cylinder",
    "torus",
];

const SHAPE_OPERATION_NONE = 0;
const SHAPE_OPERATION_ASSIGN = 1;
const SHAPE_OPERATION_UNION = 2;
const SHAPE_OPERATION_INTERSECTION = 3;
const SHAPE_OPERATION_DIFF = 4;

const KEYBOARD_CONTROL_COEFFICIENT = 0.01;
const TOUCH_CONTROL_COEFFICIENT = 0.005;

// Set true if you want to get reflections on crystal surfaces
// but it will doubles GPU processing load.
var realistic_render = false;

var cameraPosition = [ 0.0, 0.0, -1.0 ];
var cameraVelocity = [ 0.0, 0.0, 0.0 ];
var wallOffset = 1.1;

var gl_shapes = [];
const gl_shapes_init = [
    {
	    name: "floor",
	    type: [ SHAPE_TYPE_WALL, SHAPE_TYPE_NULL, SHAPE_TYPE_NULL, SHAPE_TYPE_NULL ],
	    va: createZerosMat4([ 0.0, -wallOffset, 0.0, SHAPE_OPERATION_ASSIGN ]),
	    vb: createZerosMat4([ 0.0, 1.0, 0.0 ]),
	    fa: createVec4(), // UNUSED
	    fb: createVec4(), // UNUSED
	    col: [ 0.0, 0.0, 0.0 ],
	    ref: [ 0.1, 0.1, 0.1 ],
	    f0: 0.8,
	    cr: 0,
	    mu: 1.2,
    },
    {
	    name: "ceil",
	    type: [ SHAPE_TYPE_WALL, SHAPE_TYPE_NULL, SHAPE_TYPE_NULL, SHAPE_TYPE_NULL ],
	    va: createZerosMat4([ 0.0, wallOffset, 0.0, SHAPE_OPERATION_ASSIGN ]),
	    vb: createZerosMat4([ 0.0, -1.0, 0.0 ]),
	    fa: createVec4(), // UNUSED
	    fb: createVec4(), // UNUSED
	    col: [ 0.5, 0.5, 0.5 ],
	    ref: [ 0.4, 0.4, 0.4 ],
	    f0: 0.8,
	    cr: 0,
	    mu: 1.2,
    },
    {
	    name: "left_wall",
	    type: [ SHAPE_TYPE_WALL, SHAPE_TYPE_NULL, SHAPE_TYPE_NULL, SHAPE_TYPE_NULL ],
	    va: createZerosMat4([ -wallOffset, 0.0, 0.0, SHAPE_OPERATION_ASSIGN ]),
	    vb: createZerosMat4([ 1.0, 0.0, 0.0 ]),
	    fa: createVec4(), // UNUSED
	    fb: createVec4(), // UNUSED
	    col: [ 0.5, 0.5, 0.8 ],
	    ref: [ 0.5, 0.5, 0.8 ],
	    f0: 0.8,
	    cr: 0,
	    mu: 1.2,
    },
    {
	    name: "right_wall",
	    type: [ SHAPE_TYPE_WALL, SHAPE_TYPE_NULL, SHAPE_TYPE_NULL, SHAPE_TYPE_NULL ],
	    va: createZerosMat4([ wallOffset, 0.0, 0.0, SHAPE_OPERATION_ASSIGN ]),
	    vb: createZerosMat4([ -1.0, 0.0, 0.0 ]),
	    fa: createVec4(), // UNUSED
	    fb: createVec4(), // UNUSED
	    col: [ 0.25, 0.5, 0.25 ],
	    ref: [ 0.25, 0.5, 0.25 ],
	    f0: 0.8,
	    cr: 0,
	    mu: 1.2,
    },
    {
	    name: "back_light_wall",
	    type: [ SHAPE_TYPE_WALL, SHAPE_TYPE_NULL, SHAPE_TYPE_NULL, SHAPE_TYPE_NULL ],
	    va: createZerosMat4([ 0.0, 0.0, -2.0, SHAPE_OPERATION_ASSIGN ]),
	    vb: createZerosMat4([ 0.0, 0.0, 1.0 ]),
	    fa: createVec4(), // UNUSED
	    fb: createVec4(), // UNUSED
	    col: [ 2.0, 2.0, 2.0 ],
	    ref: [ 0.1, 0.1, 0.1 ],
	    f0: 0.8,
	    cr: 0,
	    mu: 1.2,
    },

    {
	    type: [ SHAPE_TYPE_SPHERE, SHAPE_TYPE_NULL, SHAPE_TYPE_NULL, SHAPE_TYPE_NULL ],
	    va: createZerosMat4([ -0.8, 0.7, 2.2, SHAPE_OPERATION_ASSIGN ]),
	    vb: createZerosMat4(), // UNUSED
	    fa: [ 0.3, 0.0, 0.0, 0.0 ],
	    fb: createVec4(), // UNUSED
	    col: [ 0.0, 0.0, 0.0 ],
	    ref: [ 0.9, 0.9, 0.9 ],
	    f0: 0.8,
	    cr: 0,
	    mu: 1.2,
    },

    {
	    type: [ SHAPE_TYPE_CYLINDER, SHAPE_TYPE_NULL, SHAPE_TYPE_NULL, SHAPE_TYPE_NULL ],
	    va: createZerosMat4([ -0.6, -0.7, 3.2, SHAPE_OPERATION_ASSIGN ]),
	    vb: createZerosMat4([ 0.0, 0.7, 1.8 ]),
	    fa: [ 0.1, 0.0, 0.0, 0.0 ],
	    fb: createVec4(), // UNUSED
	    col: [ 0.0, 0.0, 0.0 ],
	    ref: [ 0.99, 0.99, 0.99 ],
	    f0: 0.8,
	    cr: 0,
	    mu: 1.2,
    },

    {
	    type: [ SHAPE_TYPE_TORUS, SHAPE_TYPE_SPHERE, SHAPE_TYPE_NULL, SHAPE_TYPE_NULL ],
	    va: createZerosMat4([
		-0.1, 0.0, 1.8, SHAPE_OPERATION_ASSIGN,
		-0.1, -0.2, 1.8, SHAPE_OPERATION_INTERSECTION,
		]),
	    vb: createZerosMat4([ 0.4, 0.0, 0.4 ]),
	    fa: [ 0.3, 0.2, 0.0, 0.0 ],
	    fb: [ 0.1, 0.0, 0.0, 0.0 ],
	    col: [ 0.15, 0.05, 0.05 ],
	    ref: [ 0.3, 0.1, 0.1 ],
	    f0: 0.8,
	    cr: 1,
	    mu: 1.4,
    },
];



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
	#define RAY_MARCHING_DISTANCE_EPSILON 1.0E-3
	#define NUM_SHAPE_MAX 16
	#define MAX_ITER_MARCHING 90

	#define SHAPE_TYPE_WALL 0
	#define SHAPE_TYPE_SPHERE 1
	#define SHAPE_TYPE_CYLINDER 2
	#define SHAPE_TYPE_TORUS 3

	#define SHAPE_OPERATION_NONE 0.0
	#define SHAPE_OPERATION_ASSIGN 1.0
	#define SHAPE_OPERATION_UNION 2.0
	#define SHAPE_OPERATION_INTERSECTION 3.0
	#define SHAPE_OPERATION_DIFF 4.0

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
	uniform vec3 cameraPosition;
	uniform float max_iter;

	// Using struct makes compiling time very long
	uniform int numberOfShapes;
	uniform ivec4 shape_type[NUM_SHAPE_MAX];
	uniform mat4 shape_va[NUM_SHAPE_MAX];
	uniform mat4 shape_vb[NUM_SHAPE_MAX];
	uniform vec4 shape_fa[NUM_SHAPE_MAX];
	uniform vec4 shape_fb[NUM_SHAPE_MAX];
	uniform vec3 shape_col[NUM_SHAPE_MAX];
	uniform vec3 shape_ref[NUM_SHAPE_MAX];
	uniform float shape_f0[NUM_SHAPE_MAX]; // Fresnel reflection coefficient at perpendicular incident
	uniform float shape_cr[NUM_SHAPE_MAX]; // crystal

	float exposure = 1.08;
	float no_fog = 0.9; // probability of rays not hit particle in the air

	in vec3 vTextureCoord;

	out vec4 fragmentColor;

	float random(vec2 v) {
		return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453);
	}

	float d_union(float shape0, float shape1)
	{
		return min(shape0, shape1);
	}

	float d_intersection(float shape0, float shape1)
	{
		return max(shape0, shape1);
	}

	// Calculate shape0 - shape1
	// args:
	//     shape0: distance of the base shape
	//     shape1: distance of the subtract shape
	float d_diff(float shape0, float shape1)
	{
		return max(shape0, -shape1);
	}

	float d_crystal(float shape)
	{
		return abs(shape);
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

	float d_shape(int shape, vec3 pos)
	{
		float d;
		float d_tmp;
		for (int i = 0; i < 4; ++i) {
			if (shape_va[shape][i].w == SHAPE_OPERATION_NONE) {
				// DO NOTHING
			} else if (shape_type[shape][i] == SHAPE_TYPE_WALL) {
				////
				// wall hit
				////
				d_tmp = d_plane(shape_va[shape][i].xyz, shape_vb[shape][i].xyz, pos);
			} else if (shape_type[shape][i] == SHAPE_TYPE_SPHERE) {
				////
				// sphere hit
				////
				d_tmp = d_sphere(shape_va[shape][i].xyz, shape_fa[shape][i], pos);
			} else if (shape_type[shape][i] == SHAPE_TYPE_CYLINDER) {
				////
				// cylinder hit
				////
				d_tmp = d_cylinder(shape_va[shape][i].xyz, shape_vb[shape][i].xyz, shape_fa[shape][i], pos);
			} else if (shape_type[shape][i] == SHAPE_TYPE_TORUS) {
				////
				// torus hit
				////
				d_tmp = d_torus(shape_va[shape][i].xyz, shape_vb[shape][i].xyz, shape_fa[shape][i], shape_fb[shape][i], pos);
			}
			// Logical operation
			// SHAPE_OPERATION_NONE do nothing
			if (shape_va[shape][i].w == SHAPE_OPERATION_ASSIGN) {
				d = d_tmp;
			} else if (shape_va[shape][i].w == SHAPE_OPERATION_UNION) {
				d = d_union(d, d_tmp);
			} else if (shape_va[shape][i].w == SHAPE_OPERATION_INTERSECTION) {
				d = d_intersection(d, d_tmp);
			} else if (shape_va[shape][i].w == SHAPE_OPERATION_DIFF) {
				d = d_diff(d, d_tmp);
			}
		}
		if (shape_cr[shape] != 0.0) {
			d = d_crystal(d);
		}

		return d;
	}

	// args:
	//     hit: the index of shape which the ray hits
	vec3 getNormVec(TraceData ray, int hit)
	{
		vec3 norm;

		norm.x = d_shape(hit, ray.pos + dx) - d_shape(hit, ray.pos - dx);
		norm.y = d_shape(hit, ray.pos + dy) - d_shape(hit, ray.pos - dy);
		norm.z = d_shape(hit, ray.pos + dz) - d_shape(hit, ray.pos - dz);
		norm = normalize(norm);

		return norm;
	}


	// args:
	//     origin: start point of ray
	//     ray: direction of ray (should be normalized)
	TraceData traceRay(TraceData ray, const float iter) {
		const float d_ep = RAY_MARCHING_DISTANCE_EPSILON;

		for (int i = 0; i < MAX_ITER_MARCHING; ++i) {
			float d_min = 1000.0;
			int hit = -1;

			for (int k = 0; k < min(numberOfShapes, NUM_SHAPE_MAX); ++k) {
				float d = d_shape(k, ray.pos);
				d_min = min(d, d_min);
				if (d < d_ep) {
					hit = k;
				}
			}

			// Forward ray
			ray.pos += ray.dir * d_min;

			// Add fog
			ray.col += vec3(0.10, 0.10, 0.17) * ray.reflection * log(1.0 + d_min) * abs(random(vec2(seed, ray.pos.x + ray.pos.y + ray.pos.z)));
			ray.reflection *= exp(-0.1 * d_min); // attenuation

			if (hit >= 0) {
				// Reflect
				vec3 norm = getNormVec(ray, hit);

				// Color
				ray.col += ray.reflection * shape_col[hit];

				// Reflect the ray
				if (iter > 0.0 || shape_cr[hit] == 0.0) {
					ray.dir = reflect(ray.dir, norm);

					// reflection
					ray.reflection = ray.reflection * shape_ref[hit] * vec3(mix(
					    shape_f0[hit] + (1.0 - shape_f0[hit]) * pow(1.0 - dot(ray.dir, norm), 5.0),
					    shape_f0[hit] * dot(ray.dir, norm),
					    step(2.0, iter)));
				} else {
					float n = dot(ray.dir, norm);
					ray.dir = normalize((ray.dir - n * norm) * pow(shape_cr[hit], -sign(n)) + n * norm);

					// refraction
					ray.reflection = 0.99 * ray.reflection;
				}
				ray.pos += ray.dir * d_ep * 10.0;
			}
		}
		ray.col = clamp(ray.col, 0.0, 2.0);
		return ray;
	}

	void main(void) {
		vec3 color = vec3(0.0);

		for (float iter = 0.0; iter < max_iter; iter += 1.0)
		{
			TraceData ray;
			ray.pos = cameraPosition;
			ray.dir = normalize(vTextureCoord);
			ray.col = vec3(0.0);
			ray.reflection = vec3(1.0);
			// Marching
			ray = traceRay(ray, iter);
			// Get color
			color += ray.col / max_iter;
		}

		fragmentColor = vec4(clamp(exposure * color, 0.0, 1.0), 1.0);
	}
`;



////////////////////////////////////////////////////////////////
//
//        GUI params
//
////////////////////////////////////////////////////////////////
var mousePosition_prev = { x: 0, y: 0 };
var mouseDownTarget = null;

var touchPointCount_prev = 0;
var touchDistance_prev = 0;
var touchCenter_prev = { x: 0, y: 0 };

////////////////////////////////////////////////////////////////
//
//        Initialize
//
////////////////////////////////////////////////////////////////

//window.onload = init;

function init() {
	// Close confirmation window
	const bg = document.getElementById("floating_background");
	bg.style.opacity = "0.0";
	setTimeout(
	    () => { bg.remove(); },
	    1000);

	// Initialize HTML
	// Event
	window.addEventListener(
		"mousemove",
		(e) => {
			if (mouseDownTarget) {
				if (mouseDownTarget.type === "text") {
					const input_value_max_length = 12;
					let dy = e.clientY - mousePosition_prev.y;
					let dv = 0.01 * Math.sign(-dy) * Math.exp(Math.abs(dy) / 10.0);
					dv = dv < 0.5 ? dv > -0.5 ? dv : -0.5 : 0.5;
					mouseDownTarget.value = parseFloat(mouseDownTarget.value) + dv;
					mouseDownTarget.value = mouseDownTarget.value.substring(0, input_value_max_length);
				}
				// Fire the 'change' event
				const ev = new Event('change', { bubbles: true });
				mouseDownTarget.dispatchEvent(ev);
			}
			mousePosition_prev.x = e.clientX;
			mousePosition_prev.y = e.clientY;
		});
	window.addEventListener(
		"mouseup",
		(e) => {
			// Create and Fire the change event
			if (mouseDownTarget) {
				const ev = new Event('change', { bubbles: true });
				mouseDownTarget.dispatchEvent(ev);
			}
			// Cleare target
			mouseDownTarget = null;
		});

	const canvas = document.getElementById('glcanvas');
	canvas.addEventListener(
		"keydown",
		(e) => {
			e.preventDefault();
			e.stopPropagation();

			if (event.key === 'w') {
				//cameraPosition[2] += KEYBOARD_CONTROL_COEFFICIENT;
				cameraVelocity[2] += KEYBOARD_CONTROL_COEFFICIENT;
			} else if(event.key === 'a') {
				//cameraPosition[0] -= KEYBOARD_CONTROL_COEFFICIENT;
				cameraVelocity[0] -= KEYBOARD_CONTROL_COEFFICIENT;
			} else if(event.key === 's') {
				//cameraPosition[2] -= KEYBOARD_CONTROL_COEFFICIENT;
				cameraVelocity[2] -= KEYBOARD_CONTROL_COEFFICIENT;
			} else if(event.key === 'd') {
				//cameraPosition[0] += KEYBOARD_CONTROL_COEFFICIENT;
				cameraVelocity[0] += KEYBOARD_CONTROL_COEFFICIENT;
			}
		});
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
					cameraPosition[2] += TOUCH_CONTROL_COEFFICIENT * (d - touchDistance_prev);
				}
				touchDistance_prev = d;

				// Center
				let x_c = (e.touches[0].clientX - e.touches[1].clientX) / 2.0;
				let y_c = (e.touches[0].clientY - e.touches[1].clientY) / 2.0;
				if (touchPointCount_prev) {
					cameraPosition[0] += TOUCH_CONTROL_COEFFICIENT * (x_c - touchCenter_prev.x);
					cameraPosition[1] += TOUCH_CONTROL_COEFFICIENT * (y_c - touchCenter_prev.y);
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

	// Switch
	const realisticRenderSwitch = document.getElementById("realisticRenderSwitch");
	realisticRenderSwitch.addEventListener(
		"click",
		(e) => {
			realistic_render = !realistic_render;
			if (realistic_render) {
				realisticRenderSwitch.style.borderColor = "rgb(192,64,64)";
				realisticRenderSwitch.style.backgroundColor = "rgb(24,0,0)";
			} else {
				realisticRenderSwitch.style.borderColor = "rgb(0,64,208)";
				realisticRenderSwitch.style.backgroundColor = "rgb(0,0,24)";
			}
		});

	// Initialize objects
	for (let i = 0; i < gl_shapes_init.length; ++i) {
		addObject(gl_shapes_init[i]);
	}

	// Start WebGL
	glmain();
}



////////////////////////////////////////////////////////////////
//
//        HTML DOM controls
//
////////////////////////////////////////////////////////////////

function addObject(obj)
{
	const controllPanel = addPrimitiveController(obj, gl_shapes.length);
	document.getElementById("tools").appendChild(controllPanel);

	// Add object in the world
	gl_shapes.push(obj);
}

function addWall(
    pos = [ 0.0, 0.0, 0.0 ],
    dir = [ 0.0, 0.0, -1.0 ],
    col = [ 0.1, 0.1, 0.1 ],
    ref = [ 0.1, 0.1, 0.1 ],
    f0 = 0.8,
    cr = 0,
    mu = 1.2)
{
	const obj = {
		type: [ SHAPE_TYPE_WALL, SHAPE_TYPE_NONE, SHAPE_TYPE_NONE, SHAPE_TYPE_NONE ],
		va: createZerosMat4(pos),
		vb: createZerosMat4(dir),
		fa: createVec4(), // UNUSED
		fb: createVec4(), // UNUSED
		col: col,
		ref: ref,
		f0: f0,
		cr: cr,
		mu: mu,
	};
	const controllPanel = addPrimitiveController(obj, gl_shapes.length);
	document.getElementById("tools").appendChild(controllPanel);

	// Add object in the world
	gl_shapes.push(obj);
}

function addSphere(
    pos = [ 0.0, 0.0, 0.0 ],
    radius = 0.1,
    col = [ 0.1, 0.1, 0.1 ],
    ref = [ 0.1, 0.1, 0.1 ],
    f0 = 0.8,
    cr = 0,
    mu = 1.2)
{
	const obj = {
		type: [ SHAPE_TYPE_SPHERE, SHAPE_TYPE_NONE, SHAPE_TYPE_NONE, SHAPE_TYPE_NONE ],
		va: createZerosMat4(pos),
		vb: createZerosMat4(), // UNUSED
		fa: [ radius, 0.0, 0.0, 0.0 ],
		fb: createVec4(), // UNUSED
		col: col,
		ref: ref,
		f0: f0,
		cr: cr,
		mu: mu,
	};
	const controllPanel = addPrimitiveController(obj, gl_shapes.length);
	document.getElementById("tools").appendChild(controllPanel);

	// Add object in the world
	gl_shapes.push(obj);
}

function addCylinder(
    pos0 = [ -0.1, 0.0, 0.0 ],
    pos1 = [ 0.1, 0.0, 0.0 ],
    radius = 0.1,
    col = [ 0.1, 0.1, 0.1 ],
    ref = [ 0.1, 0.1, 0.1 ],
    f0 = 0.8,
    cr = 0,
    mu = 1.2)
{
	const obj = {
		type: [ SHAPE_TYPE_CYLINDER, SHAPE_TYPE_NONE, SHAPE_TYPE_NONE, SHAPE_TYPE_NONE ],
		va: createZerosMat4(pos0),
		vb: createZerosMat4(pos1),
		fa: [ radius, 0.0, 0.0, 0.0 ],
		fb: createVec4(), // UNUSED
		col: col,
		ref: ref,
		f0: f0,
		cr: cr,
		mu: mu,
	};
	const controllPanel = addPrimitiveController(obj, gl_shapes.length);
	document.getElementById("tools").appendChild(controllPanel);

	// Add object in the world
	gl_shapes.push(obj);
}

function addTorus(
    pos = [ 0.0, 0.0, 0.0 ],
    dir = [ 0.0, 0.0, 1.0 ],
    radius0 = 0.2,
    radius1 = 0.1,
    col = [ 0.1, 0.1, 0.1 ],
    ref = [ 0.1, 0.1, 0.1 ],
    f0 = 0.8,
    cr = 0,
    mu = 1.2)
{
	const obj = {
		type: [ SHAPE_TYPE_TORUS, SHAPE_TYPE_NONE, SHAPE_TYPE_NONE, SHAPE_TYPE_NONE ],
		va: createZerosMat4(pos),
		vb: createZerosMat4(dir),
		fa: [ radius0, 0.0, 0.0, 0.0 ],
		fb: [ radius1, 0.0, 0.0, 0.0 ],
		col: col,
		ref: ref,
		f0: f0,
		cr: cr,
		mu: mu,
	};
	const controllPanel = addPrimitiveController(obj, gl_shapes.length);
	document.getElementById("tools").appendChild(controllPanel);

	// Add object in the world
	gl_shapes.push(obj);
}



function addPrimitiveController(obj, id)
{
	const panel = document.createElement("div");
	panel.className = "primitiveControlPanel";
	panel.id = "primitiveController_" + SHAPE_TYPE_NAME[obj.type[0]] + "_" + id;
	
	// Title
	const title_bar = document.createElement("div");
	title_bar.className = "primitiveControlPanelTitleBar";
	panel.appendChild(title_bar);
	const name = document.createElement("input");
	name.type = "text";
	name.className = "primitiveControlPanelName";
	name.value = "" + SHAPE_TYPE_NAME[obj.type[0]] + "_" + id;
	if ("name" in obj) {
		name.value = obj.name;
	}
	title_bar.appendChild(name);
	const pulldown = document.createElement("div");
	pulldown.className = "primitiveControlPanelPulldown";
	pulldown.innerHTML = "V";
	pulldown.pulldownState = false;
	title_bar.appendChild(pulldown);
	const deleteButton = document.createElement("div");
	deleteButton.className = "primitiveControlPanelDeleteButton";
	deleteButton.innerHTML = "X";
	title_bar.appendChild(deleteButton);

	pulldown.addEventListener("click",
		(e) => {
			pulldown.pulldownState = !pulldown.pulldownState;
			if (pulldown.pulldownState) {
				panel.style.height = panel.scrollHeight + "px";
				pulldown.style.transform = "rotate(0.5turn)";
			} else {
				panel.style.height = "40px";
				pulldown.style.transform = "rotate(0.0turn)";
			}
		});

	deleteButton.addEventListener("click",
		(e) => {
			panel.remove();
			gl_shapes.splice(gl_shapes.indexOf(obj), 1);
		});

	// Switches
	if (obj.type[0] === SHAPE_TYPE_WALL) {
		const position = createControlPanelVector3Control(
		    panel.id, "position",
		    "pos_X", obj.va[0],
		    "pos_Y", obj.va[1],
		    "pos_Z", obj.va[2]);
		panel.appendChild(position);
		const direction = createControlPanelVector3Control(
		    panel.id, "direction",
		    "dir_X", obj.vb[0],
		    "dir_Y", obj.vb[1],
		    "dir_Z", obj.vb[2]);
		panel.appendChild(direction);
		const color = createControlPanelVector3Control(
		    panel.id, "light_emission",
		    "red", obj.col[0],
		    "green", obj.col[1],
		    "blue", obj.col[2]);
		panel.appendChild(color);
		const reflection = createControlPanelVector3Control(
		    panel.id, "reflection",
		    "red", obj.ref[0],
		    "green", obj.ref[1],
		    "blue", obj.ref[2]);
		panel.appendChild(reflection);
		const f0 = createControlPanelInputText(
		    panel.id,
		    "reflection F0",
		    obj.f0);
		panel.appendChild(f0);
		const crystal = createControlPanelBoolSwitch(
		    panel.id,
		    "crystal",
		    "enable",
		    obj.cr != 0);
		panel.appendChild(crystal);

		panel.addEventListener("change",
			(e) => {
				for (let i = 0; i < 3; ++i) {
					obj.va[i] = position.controls[i].value;
					obj.vb[i] = direction.controls[i].value;
					obj.col[i] = color.controls[i].value;
					obj.ref[i] = reflection.controls[i].value;
				}
				obj.f0 = f0.controls[0].value;
				obj.cr = crystal.controls[0].checked ? obj.mu : 0;
			});

	} else if (obj.type[0] === SHAPE_TYPE_SPHERE) {
		const position = createControlPanelVector3Control(
		    panel.id, "position",
		    "pos_X", obj.va[0],
		    "pos_Y", obj.va[1],
		    "pos_Z", obj.va[2]);
		panel.appendChild(position);
		const radius = createControlPanelInputText(
		    panel.id, "radius",
		    obj.fa[0]);
		panel.appendChild(radius);
		const color = createControlPanelVector3Control(
		    panel.id, "light_emission",
		    "red", obj.col[0],
		    "green", obj.col[1],
		    "blue", obj.col[2]);
		panel.appendChild(color);
		const reflection = createControlPanelVector3Control(
		    panel.id, "reflection",
		    "red", obj.ref[0],
		    "green", obj.ref[1],
		    "blue", obj.ref[2]);
		panel.appendChild(reflection);
		const f0 = createControlPanelInputText(
		    panel.id,
		    "reflection F0",
		    obj.f0);
		panel.appendChild(f0);
		const crystal = createControlPanelBoolSwitch(
		    panel.id,
		    "crystal",
		    "enable",
		    obj.cr != 0);
		panel.appendChild(crystal);

		panel.addEventListener("change",
			(e) => {
				for (let i = 0; i < 3; ++i) {
					obj.va[i] = position.controls[i].value;
					obj.col[i] = color.controls[i].value;
					obj.ref[i] = reflection.controls[i].value;
				}
				obj.fa[0] = radius.controls[0].value;
				obj.f0 = f0.controls[0].value;
				obj.cr = crystal.controls[0].checked ? obj.mu : 0;
			});

	} else if (obj.type[0] === SHAPE_TYPE_CYLINDER) {
		const position0 = createControlPanelVector3Control(
		    panel.id, "position_start",
		    "pos_X", obj.va[0],
		    "pos_Y", obj.va[1],
		    "pos_Z", obj.va[2]);
		panel.appendChild(position0);
		const position1 = createControlPanelVector3Control(
		    panel.id, "position_end",
		    "pos_X", obj.vb[0],
		    "pos_Y", obj.vb[1],
		    "pos_Z", obj.vb[2]);
		panel.appendChild(position1);
		const radius = createControlPanelInputText(
		    panel.id, "radius",
		    obj.fa[0]);
		panel.appendChild(radius);
		const color = createControlPanelVector3Control(
		    panel.id, "light_emission",
		    "red", obj.col[0],
		    "green", obj.col[1],
		    "blue", obj.col[2]);
		panel.appendChild(color);
		const reflection = createControlPanelVector3Control(
		    panel.id, "reflection",
		    "red", obj.ref[0],
		    "green", obj.ref[1],
		    "blue", obj.ref[2]);
		panel.appendChild(reflection);
		const f0 = createControlPanelInputText(
		    panel.id,
		    "reflection F0",
		    obj.f0);
		panel.appendChild(f0);
		const crystal = createControlPanelBoolSwitch(
		    panel.id,
		    "crystal",
		    "enable",
		    obj.cr != 0);
		panel.appendChild(crystal);

		panel.addEventListener("change",
			(e) => {
				for (let i = 0; i < 3; ++i) {
					obj.va[i] = position0.controls[i].value;
					obj.vb[i] = position1.controls[i].value;
					obj.col[i] = color.controls[i].value;
					obj.ref[i] = reflection.controls[i].value;
				}
				obj.fa[0] = radius.controls[0].value;
				obj.f0 = f0.controls[0].value;
				obj.cr = crystal.controls[0].checked ? obj.mu : 0;
			});

	} else if (obj.type[0] === SHAPE_TYPE_TORUS) {
		const position = createControlPanelVector3Control(
		    panel.id, "position",
		    "pos_X", obj.va[0],
		    "pos_Y", obj.va[1],
		    "pos_Z", obj.va[2]);
		panel.appendChild(position);
		const direction = createControlPanelVector3Control(
		    panel.id, "direction",
		    "dir_X", obj.vb[0],
		    "dir_Y", obj.vb[1],
		    "dir_Z", obj.vb[2]);
		panel.appendChild(direction);
		const radius0= createControlPanelInputText(
		    panel.id, "radius0",
		    obj.fa[0]);
		panel.appendChild(radius0);
		const radius1 = createControlPanelInputText(
		    panel.id, "radius1",
		    obj.fb[0]);
		panel.appendChild(radius1);
		const color = createControlPanelVector3Control(
		    panel.id, "light_emission",
		    "red", obj.col[0],
		    "green", obj.col[1],
		    "blue", obj.col[2]);
		panel.appendChild(color);
		const reflection = createControlPanelVector3Control(
		    panel.id, "reflection",
		    "red", obj.ref[0],
		    "green", obj.ref[1],
		    "blue", obj.ref[2]);
		panel.appendChild(reflection);
		const f0 = createControlPanelInputText(
		    panel.id,
		    "reflection F0",
		    obj.f0);
		panel.appendChild(f0);
		const crystal = createControlPanelBoolSwitch(
		    panel.id,
		    "crystal",
		    "enable",
		    obj.cr != 0);
		panel.appendChild(crystal);

		panel.addEventListener("change",
			(e) => {
				for (let i = 0; i < 3; ++i) {
					obj.va[i] = position.controls[i].value;
					obj.vb[i] = direction.controls[i].value;
					obj.col[i] = color.controls[i].value;
					obj.ref[i] = reflection.controls[i].value;
				}
				obj.fa[0] = radius0.controls[0].value;
				obj.fb[0] = radius1.controls[0].value;
				obj.f0 = f0.controls[0].value;
				obj.cr = crystal.controls[0].checked ? obj.mu : 0;
			});

	}

	return panel;
}

function createControlPanelBoolSwitch(id, title_name, label_name, default_value = false)
{
	const grid = document.createElement("div");
	grid.className = "primitiveControlPanelGrid";
	// title
	const title_label = document.createElement("div");
	title_label.className = "primitiveControlPanelControlTitle";
	title_label.innerText = title_name;
	grid.appendChild(title_label);
	// switch
	const input = document.createElement("input");
	input.type = "checkbox";
	input.id = "" + id + "_" + title_name + "_" + label_name;
	input.className = "primitiveControlPanelBoolSwitch";
	input.checked = default_value;
	grid.appendChild(input);
	const label = document.createElement("label");
	label.className = "primitiveControlPanelBoolSwitch";
	label.innerText = label_name;
	label.htmlFor = input.id;
	grid.appendChild(label);
	
	grid.controls = [ input ];
	for (let i = 0; i < grid.controls.length; ++i) {
		grid.controls[i].addEventListener("mousedown",
			(e) => {
				e.preventDefault();
				e.stopPropagation();
				mouseDownTarget = grid.controls[i];
				mousePosition_prev.x = e.clientX;
				mousePosition_prev.y = e.clientY;
			});
	}

	return grid;
}

function createControlPanelInputText(id, title_name, default_value = "")
{
	const input_value_max_length = 12;

	const grid = document.createElement("div");
	grid.className = "primitiveControlPanelGrid";
	// title
	const title_label = document.createElement("div");
	title_label.className = "primitiveControlPanelControlTitle";
	title_label.innerText = title_name;
	grid.appendChild(title_label);
	// input
	const input = document.createElement("input");
	input.id = "" + id + "_" + title_name;
	input.type = "text";
	input.className = "primitiveControlPanelInputText";
	input.maxLength = input_value_max_length;
	input.size = input_value_max_length;
	input.value = default_value;
	grid.appendChild(input);

	grid.controls = [ input ];
	for (let i = 0; i < grid.controls.length; ++i) {
		grid.controls[i].addEventListener("mousedown",
			(e) => {
				e.preventDefault();
				e.stopPropagation();
				mouseDownTarget = grid.controls[i];
				mouseDownTarget.focus();
				mousePosition_prev.x = e.clientX;
				mousePosition_prev.y = e.clientY;
			});
	}

	return grid;
}

function createControlPanelVector3Control(id, title_name, lab_0, val_0, lab_1, val_1, lab_2, val_2)
{
	const input_value_max_length = 12;

	const grid = document.createElement("div");
	grid.className = "primitiveControlPanelGrid";
	// Title
	const title_label = document.createElement("div");
	title_label.className = "primitiveControlPanelControlTitle";
	title_label.innerText = title_name;
	grid.appendChild(title_label);
	// X
	const label_0 = document.createElement("label");
	label_0.className = "primitiveControlPanelInputTextLabel";
	label_0.innerText = lab_0;
	grid.appendChild(label_0);
	const value_0 = document.createElement("input");
	value_0.id = "" + id + "_" + title_name + "_" + lab_0;
	value_0.type = "text";
	value_0.className = "primitiveControlPanelInputText";
	value_0.maxLength = input_value_max_length;
	value_0.size = input_value_max_length;
	value_0.value = val_0;
	grid.appendChild(value_0);
	// Y
	const label_1 = document.createElement("label");
	label_1.className = "primitiveControlPanelInputTextLabel";
	label_1.innerText = lab_1;
	grid.appendChild(label_1);
	const value_1 = document.createElement("input");
	value_1.id = "" + id + "_" + title_name + "_" + lab_1;
	value_1.type = "text";
	value_1.className = "primitiveControlPanelInputText";
	value_1.maxLength = input_value_max_length;
	value_1.size = input_value_max_length;
	value_1.value = val_1;
	grid.appendChild(value_1);
	// Z
	const label_2 = document.createElement("label");
	label_2.className = "primitiveControlPanelInputTextLabel";
	label_2.innerText = lab_2;
	grid.appendChild(label_2);
	const value_2= document.createElement("input");
	value_2.id = "" + id + "_" + title_name + "_" + lab_2;
	value_2.type = "text";
	value_2.className = "primitiveControlPanelInputText";
	value_2.maxLength = input_value_max_length;
	value_2.size = input_value_max_length;
	value_2.value = val_2;
	grid.appendChild(value_2);

	grid.controls = [
	    value_0,
	    value_1,
	    value_2,
	];
	for (let i = 0; i < grid.controls.length; ++i) {
		grid.controls[i].addEventListener("mousedown",
			(e) => {
				e.stopPropagation();
				mouseDownTarget = grid.controls[i];
				mouseDownTarget.focus();
				mousePosition_prev.x = e.clientX;
				mousePosition_prev.y = e.clientY;
			});
	}

	return grid;
}




////////////////////////////////////////////////////////////////
//
//        WebGL
//
////////////////////////////////////////////////////////////////
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
					cr: gl.getUniformLocation(renderShaderProgram, 'shape_cr[' + ind + ']'),
				};
			}),
			max_iter: gl.getUniformLocation(renderShaderProgram, 'max_iter'),
			max_bound: gl.getUniformLocation(renderShaderProgram, 'max_bound'),
		},
	};

	const screen = createScreen();
	const screenBuffers = createVBO(gl, screen);

	// Draw the scene repeatedly
	let count = 0;
	function render(now) {
		// Move cmaera
		cameraPosition[1] = Math.sin(2.0 * Math.PI * count / 137) * 0.05;
		for (let i = 0; i < DIMENSION_NUM_3; ++i) {
			cameraPosition[i] += cameraVelocity[i];
		}
		// Limit the camera position inside X-Y walls
		if (Math.abs(cameraPosition[DIMENSION_NUM_3_X]) >= 1.0) {
			cameraPosition[DIMENSION_NUM_3_X] = Math.sign(cameraPosition[DIMENSION_NUM_3_X]) * (1.0 - 1E-6);
			cameraVelocity[DIMENSION_NUM_3_X] = 0.0; // Stop movement
		}
		if (Math.abs(cameraPosition[DIMENSION_NUM_3_Y]) >= 1.0) {
			cameraPosition[DIMENSION_NUM_3_Y] = Math.sign(cameraPosition[DIMENSION_NUM_3_Y]) * (1.0 - 1E-6);
			cameraVelocity[DIMENSION_NUM_3_Y] = 0.0; // Stop movement
		}

		++count;
		drawScene(gl, renderProgramInfo, screenBuffers);

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

function drawScene(gl, renderProgramInfo, screenBuffers)
{
	////////////////////////////////////////////////////////////////
	// Render
	////////////////////////////////////////////////////////////////
	gl.useProgram(renderProgramInfo.shaderProgram);

	gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear with black
	gl.clearDepth(1.0); // Clear everything
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DETPH_BUFFER_BIT);

	gl.uniform1f(
	    renderProgramInfo.uniformLocations.seed,
	    Math.random() * 10.0);
	gl.uniform3fv(
	    renderProgramInfo.uniformLocations.cameraPosition,
	    cameraPosition);
	gl.uniform1i(
	    renderProgramInfo.uniformLocations.numberOfShapes,
	    gl_shapes.length);
	gl.uniform1f(
	    renderProgramInfo.uniformLocations.max_iter,
	    realistic_render ? 2.0 : 1.0);
	for (let i = 0; i < gl_shapes.length; ++i) {
		gl.uniform4iv(
		    renderProgramInfo.uniformLocations.shapes[i].type,
		    gl_shapes[i].type);
		gl.uniformMatrix4fv(
		    renderProgramInfo.uniformLocations.shapes[i].va,
		    false,
		    gl_shapes[i].va);
		gl.uniformMatrix4fv(
		    renderProgramInfo.uniformLocations.shapes[i].vb,
		    false,
		    gl_shapes[i].vb);
		gl.uniform4fv(
		    renderProgramInfo.uniformLocations.shapes[i].fa,
		    gl_shapes[i].fa);
		gl.uniform4fv(
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
		gl.uniform1f(
		    renderProgramInfo.uniformLocations.shapes[i].cr,
		    gl_shapes[i].cr);
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

function createVec4()
{
	let v = new Array(4);
	v[0] = 0.0;
	v[1] = 0.0;
	v[2] = 0.0;
	v[3] = 0.0;
	return v;
}

function createZerosMat4(initials = [])
{
	let A = new Array(16);
	for (let i = 0; i < Math.min(initials.length, 16); ++i) {
		A[i] = initials[i];
	}
	for (let i = initials.length; i < 16; ++i) {
		A[i] = 0.0;
	}
	return A;
}


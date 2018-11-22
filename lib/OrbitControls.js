/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 *
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * @author miyao update for AMSlicerUI, change html to qt canvas
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - left mouse / touch: one-finger move
//    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
//    Pan - right mouse, or arrow keys / touch: two-finger move

THREE.OrbitControls = function (object, canvas, target) {

	this.object = object;

	//this.domElement = ( domElement !== undefined ) ? domElement : document;
	this.canvas = canvas;

	// Set to false to disable this control
	this.enabled = true;

	// "target" sets the location of focus, where the object orbits around
	this.target = target;

	// How far you can dolly in and out ( PerspectiveCamera only )
	this.minDistance = 0;
	this.maxDistance = Infinity;

	// How far you can zoom in and out ( OrthographicCamera only )
	this.minZoom = 0;
	this.maxZoom = Infinity;

	// How far you can orbit vertically, upper and lower limits.
	// Range is 0 to Math.PI radians.
	this.minPolarAngle = 0; // radians
	this.maxPolarAngle = Math.PI; // radians

	// How far you can orbit horizontally, upper and lower limits.
	// If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
	this.minAzimuthAngle = -Infinity; // radians
	this.maxAzimuthAngle = Infinity; // radians

	// Set to true to enable damping (inertia)
	// If damping is enabled, you must call controls.update() in your animation loop
	this.enableDamping = false;
	this.dampingFactor = 0.25;

	// This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
	// Set to false to disable zooming
	this.enableZoom = true;
	this.zoomSpeed = 1;

	// Set to false to disable rotating
	this.enableRotate = true;
	//this.rotateSpeed = 1.0;

	// Set to false to disable panning
	this.enablePan = true;
	this.panSpeed = 1.0;
	this.screenSpacePanning = false; // if true, pan in screen-space
	this.keyPanSpeed = 7.0; // pixels moved per arrow key push

	// Set to true to automatically rotate around the target
	// If auto-rotate is enabled, you must call controls.update() in your animation loop
	this.autoRotate = false;
	this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

	// Set to false to disable use of the keys
	this.enableKeys = true;

	// The four arrow keys
	this.keys = {
		LEFT: 37,
		UP: 38,
		RIGHT: 39,
		BOTTOM: 40
	};

	// Mouse buttons
	this.mouseButtons = {
		ORBIT: THREE.MOUSE.LEFT,
		ZOOM: THREE.MOUSE.MIDDLE,
		PAN: THREE.MOUSE.RIGHT
	};

	// // miyao: for mouse
	// this.rotateStart = new THREE.Vector2();
	// this.rotateEnd = new THREE.Vector2();
	// this.rotateDelta = new THREE.Vector2();
	// this.panStart = new THREE.Vector2();
	// this.panEnd = new THREE.Vector2();
	// this.panDelta = new THREE.Vector2();
	// this.panOffset = new THREE.Vector3();

	//
	// public methods
	//

	this.getZoomScale = function () {

		return Math.pow(0.95, scope.zoomSpeed);

	};

	this.rotateLeft = function (angle) {

		thetaDelta -= angle;

	};

	this.rotateUp = function (angle) {

		phiDelta -= angle;

	};

	// deltaX and deltaY are in pixels; right and down are positive
	this.pan = function () {

		var offset = new THREE.Vector3();

		return function pan(deltaX, deltaY) {

			if (scope.object instanceof THREE.PerspectiveCamera) {

				// perspective
				var position = scope.object.position;
				offset.copy(position).sub(scope.target);
				var targetDistance = offset.length();

				// half of the fov is center to top of screen
				targetDistance *= Math.tan((scope.object.fov / 2) * Math.PI / 180.0);

				// we use only clientHeight here so aspect ratio does not distort speed
				panLeft(deltaX);
				panUp(deltaY);

			} else if (scope.object instanceof THREE.OrthographicCamera) {

				// orthographic
				//panLeft( deltaX * ( scope.object.right - scope.object.left ) / scope.object.zoom / scope.canvas.width, scope.object.matrix );
				panLeft(deltaX);
				//panUp( deltaY * ( scope.object.top - scope.object.bottom ) / scope.object.zoom / scope.canvas.height, scope.object.matrix );
				panUp(deltaY);
			} else {

				// camera neither orthographic nor perspective
				console.warn('WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');
				scope.enablePan = false;

			}

		};

	}();

	this.dollyIn = function (dollyScale) {

		if (scope.object instanceof THREE.PerspectiveCamera) {

			scale /= dollyScale;

		} else if (scope.object instanceof THREE.OrthographicCamera) {

			scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom * dollyScale));
			scope.object.updateProjectionMatrix();

		} else {

			console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
			scope.enableZoom = false;

		}

	};

	this.dollyOut = function (dollyScale) {

		if (scope.object instanceof THREE.PerspectiveCamera) {

			scale *= dollyScale;

		} else if (scope.object instanceof THREE.OrthographicCamera) {

			scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom / dollyScale));
			scope.object.updateProjectionMatrix();

		} else {

			console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
			scope.enableZoom = false;

		}

	};

	this.getPolarAngle = function () {

		return phi;

	};

	this.getAzimuthalAngle = function () {

		return theta;

	};

	// this method is exposed, but perhaps it would be better if we can make it private...
	this.update = function (mouseStatus) {
		var offset = new THREE.Vector3();

		// so camera.up is the orbit axis
		var quat = new THREE.Quaternion().setFromUnitVectors(object.up, new THREE.Vector3(0, 1, 0));
		var quatInverse = quat.clone().inverse();

		var position = scope.object.position;

		offset.copy(position).sub(scope.target);

		// rotate offset to "y-axis-is-up" space
		offset.applyQuaternion(quat);

		// angle from z-axis around y-axis
		theta = Math.atan2(offset.x, offset.z);

		// angle from y-axis
		phi = Math.atan2(Math.sqrt(offset.x * offset.x + offset.z * offset.z), offset.y);
		
		theta += thetaDelta;
		phi += phiDelta;

		// restrict theta to be between desired limits
		theta = Math.max(scope.minAzimuthAngle, Math.min(scope.maxAzimuthAngle, theta));

		// restrict phi to be between desired limits
		phi = Math.max(scope.minPolarAngle, Math.min(scope.maxPolarAngle, phi));

		// restrict phi to be betwee EPS and PI-EPS
		phi = Math.max(EPS, Math.min(Math.PI - EPS, phi));

		var radius = offset.length() * scale;

		// restrict radius to be between desired limits
		radius = Math.max(scope.minDistance, Math.min(scope.maxDistance, radius));

		// move target to panned location
		scope.target.add(panOffset);

		offset.x = radius * Math.sin(phi) * Math.sin(theta);
		offset.y = radius * Math.cos(phi);
		offset.z = radius * Math.sin(phi) * Math.cos(theta);

		// rotate offset back to "camera-up-vector-is-up" space
		offset.applyQuaternion(quatInverse);

		position.copy(scope.target).add(offset);

		if (mouseStatus === 1) {
			scope.object.lookAt(scope.target);
		}

		thetaDelta = 0;
		phiDelta = 0;
		panOffset.set(0, 0, 0);
	};


	//
	// internals
	//
	var scope = this;

	var changeEvent = {
		type: 'change'
	};
	var startEvent = {
		type: 'start'
	};
	var endEvent = {
		type: 'end'
	};

	var STATE = {
		NONE: -1,
		ROTATE: 0,
		DOLLY: 1,
		PAN: 2,
		TOUCH_ROTATE: 3,
		TOUCH_DOLLY_PAN: 4
	};

	var state = STATE.NONE;

	var EPS = 0.000001;

	// current position in spherical coordinates
	var theta;
	var phi;
	var phiDelta = 0;
	var thetaDelta = 0;

	var scale = 1;
	var panOffset = new THREE.Vector3(); // move to public

	// via: https://github.com/mrdoob/three.js/blob/master/src/math/Vector3.js
	function setFromSpherical(offset, s) {
		function setFromSphericalCoords(radius, phi, theta) {
			var sinPhiRadius = Math.sin(phi) * radius;

			offset.x = sinPhiRadius * Math.sin(theta);
			offset.y = Math.cos(phi) * radius;
			offset.z = sinPhiRadius * Math.cos(theta);
		}
		return setFromSphericalCoords(s.radius, s.phi, s.theta);
	}

	function getAutoRotationAngle() {
		return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

	}

	var panLeft = function () {
		var v = new THREE.Vector3();
		return function panLeft(deltaX) {
			var te = scope.object.matrix.elements;
			var distance = deltaX * (scope.object.right - scope.object.left) / scope.canvas.width;
			// get X column of objectMatrix
			v.set(te[0], te[1], te[2]);
			v.multiplyScalar(-distance);
			panOffset.add(v);
		};
	}();

	var panUp = function () {
		var v = new THREE.Vector3();
		return function panUp(deltaY) {
			var te = scope.object.matrix.elements;
			var distance = deltaY * (scope.object.top - scope.object.bottom) / scope.canvas.height;
			// get Y column of objectMatrix
			v.set(te[4], te[5], te[6]);
			v.multiplyScalar(distance);
			panOffset.add(v);
		};
	}();

	//this.update();

};

//THREE.OrbitControls.prototype = Object.create(THREE.EventDispatcher.prototype);
THREE.OrbitControls.prototype.constructor = THREE.OrbitControls;

Object.defineProperties(THREE.OrbitControls.prototype, {

	center: {

		get: function () {

			console.warn('THREE.OrbitControls: .center has been renamed to .target');
			return this.target;

		}

	},

	// backward compatibility

	noZoom: {

		get: function () {

			console.warn('THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.');
			return !this.enableZoom;

		},

		set: function (value) {

			console.warn('THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.');
			this.enableZoom = !value;

		}

	},

	noRotate: {

		get: function () {

			console.warn('THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.');
			return !this.enableRotate;

		},

		set: function (value) {

			console.warn('THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.');
			this.enableRotate = !value;

		}

	},

	noPan: {

		get: function () {

			console.warn('THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.');
			return !this.enablePan;

		},

		set: function (value) {

			console.warn('THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.');
			this.enablePan = !value;

		}

	},

	noKeys: {

		get: function () {

			console.warn('THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.');
			return !this.enableKeys;

		},

		set: function (value) {

			console.warn('THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.');
			this.enableKeys = !value;

		}

	},

	staticMoving: {

		get: function () {

			console.warn('THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.');
			return !this.enableDamping;

		},

		set: function (value) {

			console.warn('THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.');
			this.enableDamping = !value;

		}

	},

	dynamicDampingFactor: {

		get: function () {

			console.warn('THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.');
			return this.dampingFactor;

		},

		set: function (value) {

			console.warn('THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.');
			this.dampingFactor = value;

		}

	}

});
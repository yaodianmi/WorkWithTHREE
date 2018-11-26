/**
 * @author miyao
 */
// a helper to show the world-axis-aligned bounding box for an object with Dotted line
THREE.DottedBoundingBoxHelper = function ( object, hex ) {

	var color = ( hex !== undefined ) ? hex : 0x888888;

	this.object = object;

	this.box = new THREE.Box3();

	var geometry = new THREE.BoxGeometry( 1, 1, 1 );

	var edges = new THREE.EdgesGeometry( geometry );
	
	THREE.LineSegments.call( this, edges, new THREE.LineDashedMaterial( { 
		color: color,
		dashSize: 0.1, 
		gapSize: 0.1,
		linewidth: 1
	}));

}

THREE.DottedBoundingBoxHelper.prototype = Object.create( LineSegments.prototype );
THREE.DottedBoundingBoxHelper.prototype.constructor = THREE.DottedBoundingBoxHelper;

THREE.DottedBoundingBoxHelper.prototype.update = function () {

	this.computeLineDistances(); // 非常重要, 不然出不来虚线效果

	this.box.setFromObject( this.object );

	this.box.size( this.scale );

	this.box.center( this.position );

};
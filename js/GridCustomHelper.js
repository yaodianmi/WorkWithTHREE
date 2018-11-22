/**
 * @author miyao
 * @brief 自定义GridHelper(like GridHelper. 你可以直接把这段代码copy到你的three.js里, 正如这个项目里的three.js)
 */

THREE.GridCustomHelper = function ( length, width, lengthStep, widthStep ) {
    length = length || 10;
    width = width || 10;
    lengthStep = lengthStep || width / 10;  //!<画length的步进
    widthStep = widthStep || length / 10;  //!<画width的步进


    var geometry = new THREE.Geometry();
    var material = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors } );

    this.color1 = new THREE.Color( 0x444444 );
    this.color2 = new THREE.Color( 0x888888 );

    var step = width / 10;
    for ( var i = - width; i <= width; i += lengthStep ) {
        geometry.vertices.push(
            new THREE.Vector3( - length, 0, i ), new THREE.Vector3( length, 0, i )
        );

        var color = i === 0 ? this.color1 : this.color2;

        geometry.colors.push( color, color );
    }

    step = length / 10;
    for ( var i = - length; i <= length; i += widthStep ) {
        geometry.vertices.push(
            new THREE.Vector3( i, 0, - width ), new THREE.Vector3( i, 0, width )
        );

        var color = i === 0 ? this.color1 : this.color2;

        geometry.colors.push( color, color );
    }

    THREE.LineSegments.call( this, geometry, material );

};

THREE.GridCustomHelper.prototype = Object.create( THREE.LineSegments.prototype );
THREE.GridCustomHelper.prototype.constructor = THREE.GridHelper;

THREE.GridCustomHelper.prototype.setColors = function( colorCenterLine, colorGrid ) {

    this.color1.set( colorCenterLine );
    this.color2.set( colorGrid );

    this.geometry.colorsNeedUpdate = true;

};
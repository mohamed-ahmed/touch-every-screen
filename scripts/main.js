require(["scripts/jquery-1.11.0.min.js",
         "scripts/Three.js",
         "scripts/leap.min.js"], 
         function($, THREE, Leap){

"use strict";

// Store frame for motion functions
var previousFrame = null;
var paused = false;
var pauseOnGesture = false;
var positions = {
  topLeft : undefined,
  topRight: undefined,
  bottomLeft: undefined,
  bottomRight: undefined
};

var globalFrame;
var plane;

// Setup Leap loop with frame callback function
var controllerOptions = {enableGestures: true};

Leap.loop(controllerOptions, function(frame) {
  if (paused) {
    return; // Skip this update
  }

  globalFrame = frame;

  // Display Frame object data
  var frameOutput = document.getElementById("frameData");

  var frameString = "Frame ID: " + frame.id  + "<br />"
                  + "Timestamp: " + frame.timestamp + " &micro;s<br />"
                  + "Hands: " + frame.hands.length + "<br />"
                  + "Fingers: " + frame.fingers.length + "<br />"
                  + "Tools: " + frame.tools.length + "<br />"
                  + "Gestures: " + frame.gestures.length + "<br />";

  // Frame motion factors
  if (previousFrame && previousFrame.valid) {
    var translation = frame.translation(previousFrame);
    frameString += "Translation: " + vectorToString(translation) + " mm <br />";

    var rotationAxis = frame.rotationAxis(previousFrame);
    var rotationAngle = frame.rotationAngle(previousFrame);
    frameString += "Rotation axis: " + vectorToString(rotationAxis, 2) + "<br />";
    frameString += "Rotation angle: " + rotationAngle.toFixed(2) + " radians<br />";

    var scaleFactor = frame.scaleFactor(previousFrame);
    frameString += "Scale factor: " + scaleFactor.toFixed(2) + "<br />";
  }
  frameOutput.innerHTML = "<div style='width:300px; float:left; padding:5px'>" + frameString + "</div>";

  // Display Hand object data
  var handOutput = document.getElementById("handData");
  var handString = "";
  if (frame.hands.length > 0) {
    for (var i = 0; i < frame.hands.length; i++) {
      var hand = frame.hands[i];

      handString += "<div style='width:300px; float:left; padding:5px'>";
      handString += "Hand ID: " + hand.id + "<br />";
      handString += "Direction: " + vectorToString(hand.direction, 2) + "<br />";
      handString += "Palm normal: " + vectorToString(hand.palmNormal, 2) + "<br />";
      handString += "Palm position: " + vectorToString(hand.palmPosition) + " mm<br />";
      handString += "Palm velocity: " + vectorToString(hand.palmVelocity) + " mm/s<br />";
      handString += "Sphere center: " + vectorToString(hand.sphereCenter) + " mm<br />";
      handString += "Sphere radius: " + hand.sphereRadius.toFixed(1) + " mm<br />";

      // Hand motion factors
      if (previousFrame && previousFrame.valid) {
        var translation = hand.translation(previousFrame);
        handString += "Translation: " + vectorToString(translation) + " mm<br />";

        var rotationAxis = hand.rotationAxis(previousFrame, 2);
        var rotationAngle = hand.rotationAngle(previousFrame);
        handString += "Rotation axis: " + vectorToString(rotationAxis) + "<br />";
        handString += "Rotation angle: " + rotationAngle.toFixed(2) + " radians<br />";

        var scaleFactor = hand.scaleFactor(previousFrame);
        handString += "Scale factor: " + scaleFactor.toFixed(2) + "<br />";
      }

      // IDs of pointables (fingers and tools) associated with this hand
      if (hand.pointables.length > 0) {
        var fingerIds = [];
        var toolIds = [];
        for (var j = 0; j < hand.pointables.length; j++) {
          var pointable = hand.pointables[j];
          if (pointable.tool) {
            toolIds.push(pointable.id);
          }
          else {
            fingerIds.push(pointable.id);
          }
        }
        if (fingerIds.length > 0) {
          handString += "Fingers IDs: " + fingerIds.join(", ") + "<br />";
        }
        if (toolIds.length > 0) {
          handString += "Tools IDs: " + toolIds.join(", ") + "<br />";
        }
      }

      handString += "</div>";
    }
  }
  else {
    handString += "No hands";
  }
  handOutput.innerHTML = handString;

  // Display Pointable (finger and tool) object data
  var pointableOutput = document.getElementById("pointableData");
  var pointableString = "";
  if (frame.pointables.length > 0) {
    for (var i = 0; i < frame.pointables.length; i++) {
      var pointable = frame.pointables[i];

      pointableString += "<div style='width:250px; float:left; padding:5px'>";
      pointableString += "Pointable ID: " + pointable.id + "<br />";
      pointableString += "Belongs to hand with ID: " + pointable.handId + "<br />";

      if (pointable.tool) {
        pointableString += "Classified as a tool <br />";
        pointableString += "Length: " + pointable.length.toFixed(1) + " mm<br />";
        pointableString += "Width: "  + pointable.width.toFixed(1) + " mm<br />";
      }
      else {
        pointableString += "Classified as a finger<br />";
        pointableString += "Length: " + pointable.length.toFixed(1) + " mm<br />";
      }

      pointableString += "Direction: " + vectorToString(pointable.direction, 2) + "<br />";
      pointableString += "Tip position: " + vectorToString(pointable.tipPosition) + " mm<br />";
      pointableString += "Tip velocity: " + vectorToString(pointable.tipVelocity) + " mm/s<br />";

      pointableString += "</div>";
    }
  }
  else {
    pointableString += "<div>No pointables</div>";
  }
  pointableOutput.innerHTML = pointableString;

  // Display Gesture object data
  var gestureOutput = document.getElementById("gestureData");
  var gestureString = "";
  if (frame.gestures.length > 0) {
    if (pauseOnGesture) {
      togglePause();
    }
    for (var i = 0; i < frame.gestures.length; i++) {
      var gesture = frame.gestures[i];
      gestureString += "Gesture ID: " + gesture.id + ", "
                    + "type: " + gesture.type + ", "
                    + "state: " + gesture.state + ", "
                    + "hand IDs: " + gesture.handIds.join(", ") + ", "
                    + "pointable IDs: " + gesture.pointableIds.join(", ") + ", "
                    + "duration: " + gesture.duration + " &micro;s, ";

      switch (gesture.type) {
        case "circle":
          gestureString += "center: " + vectorToString(gesture.center) + " mm, "
                        + "normal: " + vectorToString(gesture.normal, 2) + ", "
                        + "radius: " + gesture.radius.toFixed(1) + " mm, "
                        + "progress: " + gesture.progress.toFixed(2) + " rotations";
          break;
        case "swipe":
          gestureString += "start position: " + vectorToString(gesture.startPosition) + " mm, "
                        + "current position: " + vectorToString(gesture.position) + " mm, "
                        + "direction: " + vectorToString(gesture.direction, 2) + ", "
                        + "speed: " + gesture.speed.toFixed(1) + " mm/s";
          break;
        case "screenTap":
        case "keyTap":
          gestureString += "position: " + vectorToString(gesture.position) + " mm, "
                        + "direction: " + vectorToString(gesture.direction, 2);
          break;
        default:
          gestureString += "unkown gesture type";
      }
      gestureString += "<br />";
    }
  }
  else {
    gestureString += "No gestures";
  }
  gestureOutput.innerHTML = gestureString;

  // Store frame for motion functions
  previousFrame = frame;
})

function vectorToString(vector, digits) {
  if (typeof digits === "undefined") {
    digits = 1;
  }
  return "(" + vector[0].toFixed(digits) + ", "
             + vector[1].toFixed(digits) + ", "
             + vector[2].toFixed(digits) + ")";
}

function togglePause() {
  paused = !paused;

  if (paused) {
    document.getElementById("pause").innerText = "Resume";
  } else {
    document.getElementById("pause").innerText = "Pause";
  }
}

function pauseForGestures() {
  if (document.getElementById("pauseOnGesture").checked) {
    pauseOnGesture = true;
  } else {
    pauseOnGesture = false;
  }
}

function writeMessage(canvas, message) {
  var context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = '18pt Calibri';
  context.fillStyle = 'black';
  context.fillText(message, 10, 25);
}
function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}

$(document).ready(function(){
  var canvas = document.getElementById('myCanvas');
  var context = canvas.getContext('2d');
  canvas.addEventListener('mousemove', function(evt) {
    var mousePos = getMousePos(canvas, evt);
    var message = 'Mouse position: ' + mousePos.x + ',' + mousePos.y;
    writeMessage(canvas, message);
  }, false);

  assignButtons();

});

function assignButtons(){
  $("#touch-top-left").click(function(){
    positions.topLeft = {
      x : globalFrame.pointables[0].tipPosition[0],
      y : globalFrame.pointables[0].tipPosition[1],
      z : globalFrame.pointables[0].tipPosition[2]
    }
  console.log("positions.topLeft: ");
  console.log(positions.topLeft);
  });


  $("#touch-top-right").click(function(){
    positions.topRight = {
      x : globalFrame.pointables[0].tipPosition[0],
      y : globalFrame.pointables[0].tipPosition[1],
      z : globalFrame.pointables[0].tipPosition[2]
    }
  console.log("positions.topRight: ");
  console.log(positions.topRight);
  });



  $("#touch-bottom-left").click(function(){
    positions.bottomLeft = {
      x : globalFrame.pointables[0].tipPosition[0],
      y : globalFrame.pointables[0].tipPosition[1],
      z : globalFrame.pointables[0].tipPosition[2]
    }
  console.log("positions.bottomLeft: ");
  console.log(positions.bottomLeft);
  });


  $("#touch-bottom-right").click(function(){
    positions.bottomRight = {
      x : globalFrame.pointables[0].tipPosition[0],
      y : globalFrame.pointables[0].tipPosition[1],
      z : globalFrame.pointables[0].tipPosition[2]
    }
  console.log("positions.bottomRight: ");
  console.log(positions.bottomRight);
  });

  $("#create-plane").click(function(){
    createPlane();
    console.log("plane: ");
    console.log(plane);
  });

}

function createPlane(){
  var vectorCoords1 = {
    x: positions.topRight.x - positions.topLeft.x,
    y: positions.topRight.y - positions.topLeft.y,
    z: positions.topRight.z - positions.topLeft.z
  };

  var vectorCoords2 = {
    x: positions.topLeft.x - positions.bottomLeft.x,
    y: positions.topLeft.y - positions.bottomLeft.y,
    z: positions.topLeft.z - positions.bottomLeft.z
  };


  var a = new THREE.Vector3(vectorCoords1.x, vectorCoords1.y, vectorCoords1.z);
  var b = new THREE.Vector3(vectorCoords2.x, vectorCoords2.y, vectorCoords2.z);

  var c = new THREE.Vector3();
  c.cross( a, b );
  console.log("normal vector");
  console.log(c);
  

}

});
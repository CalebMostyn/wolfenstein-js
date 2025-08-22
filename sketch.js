/*
  W - Forward
  S - Backward
  A - Rotate CCW
  D - Rotate CW
*/
const DEBUG = false;

let map_x = 8;
let map_y = 8;
let map_size = map_x * map_y;

let screen_width = map_x * map_size * 2;
let screen_height = 480; //map_y * map_size;

let player_size = 20;
let move_speed = 50;
let rotate_speed = 50;

let first_pass = true;

let player_x = (screen_width / 2 / 2) + 130;
let player_y = (screen_height / 2) - 30;
let delta_x;
let delta_y;
let player_angle = 180;

let num_rays = 100;
let ray_max_dist = 500;
let fov = 40;
let fov_step_size = fov / num_rays;

let ceil_offset = 100;
let floor_offset = 100;
let max_height = screen_height - ceil_offset - floor_offset;

let map = [
  1,1,1,1,1,1,1,1,
  1,0,0,0,0,0,0,1,
  1,0,3,3,3,0,0,1,
  1,0,0,0,0,0,0,1,
  1,0,0,2,0,0,0,1,
  1,0,0,2,2,2,0,1,
  1,0,0,2,0,0,0,1,
  1,1,1,1,1,1,1,1,
]

let walls = [];

function setup() {
  createCanvas(screen_width, screen_height);
  angleMode(DEGREES);
  delta_x = cos(player_angle);
  delta_y = sin(player_angle);
  init_walls();

  controls_container = createDiv();
  controls_container.style("margin", "20px");
  createP("A - Rotate Right").parent(controls_container);
  createP("D - Rotate Left").parent(controls_container);
  createP("W - Move Forward").parent(controls_container);
  createP("S - Move Backward").parent(controls_container);

  slider_container = createDiv();
  slider_container.style("margin", "20px");
  slider_label = createSpan(`Number of Rays: ${num_rays} `);
  slider_label.parent(slider_container);
  
  slider = createSlider(4, 750, num_rays);
  slider.input(update_ray_count);
  slider.parent(slider_container);
}

function update_ray_count() {
  num_rays = slider.value();
  fov_step_size = fov / num_rays;
  slider_label.html(`Number of Rays: ${num_rays} `);
}

function draw() {
  background(0);
  
  // check for inputs
  if (keyIsDown(87)) { // w
    player_y += delta_y * (move_speed / deltaTime);
    player_x += delta_x * (move_speed / deltaTime);
  }
  if (keyIsDown(65)) { // a
    player_angle -= rotate_speed / deltaTime;
    if (player_angle < 0) {
      player_angle = 360;
    }
    delta_x = cos(player_angle);
    delta_y = sin(player_angle);    
  } 
  if (keyIsDown(83)) { // s
    player_y -= delta_y * (move_speed / deltaTime);
    player_x -= delta_x * (move_speed / deltaTime);
  }
 if (keyIsDown(68)) { // d
    player_angle += rotate_speed / deltaTime;
    if (player_angle > 360) {
      player_angle = 0;
    }
    delta_x = cos(player_angle);
    delta_y = sin(player_angle);
  }
  
  draw_grid();
  draw_rays();
  draw_player();
}

function draw_player() {
  stroke(255);
  fill(255);
  circle(player_x, player_y, player_size);
  strokeWeight(5)
  line(player_x, player_y, player_x + (delta_x * 20), player_y + (delta_y * 20));
  strokeWeight(1);
}

function draw_grid() {
  stroke(255);
  
  let grid_item_width = ((screen_width) / map_x / 2);
  let grid_item_height = (screen_height / map_y);
  
  for (let i = 0; i < map_x; i++) {
    for (let j = 0; j < map_y; j++) {
      switch (map[j * map_x + i]) {
        case 1: 
          fill(0, 0, 255);
          break;
        case 2:
          fill(255,0,0);
          break;
        case 3:
          fill(0,255,0);
          break;
        default:
          fill(0);
          break;
      }
      
        rect(i * grid_item_width, j * grid_item_height, grid_item_width, grid_item_height);
    }
  }
}

function init_walls() {
  let grid_item_width = (screen_width / map_x / 2);
  let grid_item_height = (screen_height / map_y);
  
   for (let i = 0; i < map_x; i++) {
    for (let j = 0; j < map_y; j++) {
      if (map[j * map_x + i] > 0) {
        let this_color;
        switch (map[j * map_x + i]) {
          case 1: this_color = {r: 0, g: 0, b: 255};
            break;
          case 2: this_color = {r: 255, g: 0, b: 0};
            break;
          case 3: this_color = {r:0, g:255, b:0};
            break;
        }
          walls.push({x1: i * grid_item_width, y1: j * grid_item_height, x2: (i + 1) * grid_item_width, y2: j * grid_item_height, clr: this_color});
        walls.push({x1: i * grid_item_width, y1: j * grid_item_height, x2: (i) * grid_item_width, y2: (j+1) * grid_item_height, clr: this_color});
        walls.push({x1: i * grid_item_width, y1: (j+1) * grid_item_height, x2: (i + 1) * grid_item_width, y2: (j+1) * grid_item_height, clr: this_color});
        walls.push({x1: (i+1) * grid_item_width, y1: j * grid_item_height, x2: (i + 1) * grid_item_width, y2: (j+1) * grid_item_height, clr: this_color});
      }
    }
   }
}

function draw_rays() {
  let screen_offset = screen_width / 2;
  let column_width = screen_offset / (fov / fov_step_size); // for 3D
  let num_ray = 0;
  let dist_to_proj_plane = (screen_offset / 4) / (1/tan(fov/2));
  for (let a = player_angle - (fov / 2), i = 0; a <= player_angle + (fov / 2); a += fov_step_size, i++) {
    let x2 = player_x + ray_max_dist * cos(a);
    let y2 = player_y + ray_max_dist * sin(a);
    
    let intersection = closest_wall_intersection(player_x, player_y, x2, y2);
    stroke(0,150,0);
    if (intersection == null) {
      line(player_x, player_y, x2, y2);
      continue;   
    }
    line(player_x, player_y, intersection.x, intersection.y);
    
    let intersection_distance = distance(player_x, player_y, intersection.x, intersection.y);
    intersection_distance = constrain(intersection_distance, 0.1, ray_max_dist);
    let column_height = (screen_offset / intersection_distance) * dist_to_proj_plane;
    //100 * (max_height / intersection_distance);
    //p5.prototype.map(intersection_distance, 0, ray_max_dist, max_height, 0, true);
    
    let shading = 0;
    
    stroke(intersection.r - shading, intersection.g - shading, intersection.b - shading);
    fill(intersection.r, intersection.g, intersection.b);
    rect(screen_offset + (i * column_width), ceil_offset + ((max_height - column_height) / 2), column_width, column_height)
    if (first_pass && DEBUG) {
      console.log(`ray #${num_ray} height = ${Math.round(column_height)}, color = r${intersection.r} g${intersection.g} b${intersection.b}`);
    }
    
    num_ray++;
  }
  if (first_pass && DEBUG) {
    first_pass = false;
    console.log(player_x + " " + player_y)
  }
}

function closest_wall_intersection(x1,y1,x2,y2) {
  let points = [];
  let distances = [];
  let colors = [];
  for (let i = 0; i < walls.length; i++) {
    let wall = walls[i];
    let intersection = line_intersection(x1,y1,x2,y2, wall.x1, wall.y1, wall.x2, wall.y2);
    if (intersection === null) {
      points[i] = null;
      distances[i] = Number. MAX_VALUE;
      colors[i] = null;
      continue;
    } else {
      points[i] = intersection;
      distances[i] = distance(player_x,player_y,intersection.x,intersection.y);
      colors[i] = wall.clr;
    }
  }
  let index = distances.indexOf(Math.min(...distances));
  let result = points[index];
  let result_color = colors[index];
  if (result == null) {
    return null;
  } else {
      return {x: result.x, y: result.y, r: result_color.r, g: result_color.g,  b: result_color.b};    
  }
}

function line_intersection(x1,y1,x2,y2,x3,y3,x4,y4) {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

  // Check if the lines are parallel
  if (denom === 0) {
      return null; // No intersection (lines are parallel)
  }

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  // Check if the intersection point is within the line segments
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
      return null; // No intersection (not within the line segments)
  }

  // Calculate the intersection point
  const intersectionX = x1 + ua * (x2 - x1);
  const intersectionY = y1 + ua * (y2 - y1);
  // stroke (255);
  // fill(255);
  // circle(intersectionX, intersectionY, 15);
  return { x: intersectionX, y: intersectionY };
}

function distance(x1, y1, x2, y2) {
    const dx = x2 - x1; // Difference in x-coordinates
    const dy = y2 - y1; // Difference in y-coordinates
    return Math.sqrt(dx * dx + dy * dy); // Apply the distance formula
}

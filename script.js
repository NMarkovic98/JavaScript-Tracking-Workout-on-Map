'use strict';

let map, mapEvent;

class Workout {
  date = new Date();
  id = Date.now() + ''.slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords; //[lat,lng]
    this.duration = duration; //min
    this.distance = distance; //km
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.depscription = `${this.type[0].toUpperCase()}${this.type.slice(
      1
    )} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    //min/km

    this.pace = this.duration / this.distance;

    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    //kim/h
    this.speed = this.distance / (this.duration / 60);

    return this.speed;
  }
}

/////////////////////////////////
//APPLICATION ARHTECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const closeWorkout = document.querySelector('.workout__close');

class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];
  #markers = [];
  constructor() {
    //Get user's position
    this._getPosition();
    //Get data from local storage
    this._getLocalStorage();
    //Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleEvalationFields);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    // containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));
  }
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get current position');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.fr/hot/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    //Handling clcik on map
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(work => this._renderWorkoutMarker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  _toggleEvalationFields() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    //Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    //If workout is runing,create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //Check is data valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    //if workout is cycling,create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //Add new object to the workout array
    this.#workouts.push(workout);
    //Render workout on map as marker
    this._renderWorkoutMarker(workout);
    //Render wotkout in list
    this._renderWorkout(workout);
    //Hide form+clear inputs
    this._hideForm();

    //Local storage to all workouts
    this._setLocalStorage();
  }
  _renderWorkoutMarker = function (workout) {
    let marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${
          workout.type === 'running'
            ? '\u{1F3C3}\u{200D}\u{2642}\u{FE0F}'
            : '\u{1F6B2}'
        } ${workout.depscription}`
      )
      .openPopup();
    this.#markers.push(marker);
  };

  _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id=${
      workout.id
    }>
    <h2 class="workout__title">${
      workout.depscription
    }</h2><h2 class="workout__close">&#10006</h2>
   
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running'
          ? '\u{1F3C3}\u{200D}\u{2642}\u{FE0F}'
          : '\u{1F6B2}'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === 'running') {
      html += `<div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
               </div>
              <div class="workout__details">
              <span class="workout__icon">🦶🏼</span>
              <span class="workout__value">${workout.cadence}</span>
              <span class="workout__unit">spm</span>
              </div>
           </li>`;
    }
    if (workout.type === 'cycling') {
      html += ` <div class="workout__details">
                 <span class="workout__icon">⚡️</span>
                 <span class="workout__value">${workout.speed.toFixed(1)}</span>
                 <span class="workout__unit">km/h</span>
                </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevation}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>`;
    }
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    if (e.target.classList.contains('workout__close')) return;
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: 'ture',
      pan: {
        duration: 1,
      },
    });
  }
  // _deleteWorkoutList(e) {
  //   if (e.target.classList.contains('workout__close')) {
  //     const workoutEl = e.target.closest('.workout');
  //     const workout = this.#workouts.find(
  //       work => work.id === workoutEl.dataset.id
  //     );
  //     const workToDeleteI = this.#workouts.findIndex(work => work === workout);
  //     const markerToDeleteI = this.#markers.findIndex(
  //       marker => marker.lat === workout.lat
  //     );

  //     console.log(markerToDeleteI);
  //     this.#map.removeLayer(this.#markers[markerToDeleteI]);

  //     this.#markers.splice(markerToDeleteI, 1);
  //     console.log(this.#markers);
  //     this.#workouts.splice(workToDeleteI, 1);

  //     const workouts = containerWorkouts.querySelectorAll('li');
  //     workouts.forEach(work => {
  //       if (!work.classList.contains('from'))
  //         containerWorkouts.removeChild(work);
  //     });
  //     this.#workouts.forEach(work => {
  //       this._renderWorkout(work);
  //     });
  //   }
  // }

  // _deleteWorkout(e) {
  //   this._deleteWorkoutList(e);
  // }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

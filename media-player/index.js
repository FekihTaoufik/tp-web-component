class MediaPlayer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.template = this.generateTemplate();
  }
  connectedCallback() {
    this.shadowRoot.appendChild(this.template.content.cloneNode(true));

    this.player = this.shadowRoot.querySelector("audio");
    this.controls = {
      progress: this.shadowRoot.querySelector(
        "webaudio-slider[name='progress']"
      ),
      duration: this.shadowRoot.querySelector("span[name='duration']"),
      currentTime: this.shadowRoot.querySelector("span[name='current-time']"),
      volumeMeter: this.shadowRoot.querySelector("webaudio-knob[name='vu']"),
      volume: this.shadowRoot.querySelector("webaudio-knob[name='volume']"),
      balance: this.shadowRoot.querySelector("webaudio-knob[name='balance']"),
      add10sec: this.shadowRoot.querySelector("button[name='add10sec']"),
      minus10sec: this.shadowRoot.querySelector("button[name='minus10sec']"),
      rollback: this.shadowRoot.querySelector("button[name='rollback']"),
      togglePlay: this.shadowRoot.querySelector("button[name='toggle-play']"),
      toggleLoop: this.shadowRoot.querySelector("button[name='toggle-loop']"),
    };

    this.addListeners();
    this.initAttributes();

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContext();
    this.audioMediaSource = this.audioContext.createMediaElementSource(
      this.player
    );

    // handling balance
    this.audioStereoPanner = this.audioContext.createStereoPanner();
    this.audioMediaSource.connect(this.audioStereoPanner);

    var analyser = this.audioContext.createAnalyser();
    // handling volume meter

    // handling equalizer
    const canvas = this.shadowRoot.querySelector("#equalizer");
    this.equalizer = {
      analyser: analyser,
      canvas: canvas,
      ctx: canvas.getContext("2d"),
    };
    this.audioStereoPanner.connect(this.audioContext.destination);
    this.audioMediaSource.connect(this.equalizer.analyser);
    this.equalizer.analyser.connect(this.audioContext.destination);
    this.animateEqualizer();
    window.requestAnimationFrame(() => this.animateEqualizer());
  }
  disconnectedCallback() {
    this.removeListeners();
  }
  initAttributes() {
    var src = this.getAttribute("src");
    this.player.src = src;
    this.player.load();

    this.setVolume();
  }
  attributeChangedCallback(attr, oldValue, newValue) {}

  addListeners() {
    const $ = this;
    $.controls.progress.addEventListener("input", function (e) {
      $.setCurrentTime(e.target.value);
      if ($.player.paused) $.togglePlay();
    });
    $.controls.balance.addEventListener("input", function (e) {
      $.setBalance(e.target.value);
    });
    $.controls.volume.addEventListener("input", function (e) {
      $.setVolume(e.target.value);
    });

    $.controls.add10sec.addEventListener("click", function (e) {
      $.addPlayTime(10);
    });
    $.controls.minus10sec.addEventListener("click", function (e) {
      $.addPlayTime(-10);
    });
    $.controls.rollback.addEventListener("click", function (e) {
      $.rollback();
    });

    $.controls.togglePlay.addEventListener("click", (event) => {
      $.togglePlay();
    });
    $.controls.toggleLoop.addEventListener("click", (event) => {
      $.toggleLoop();
    });
    $.player.addEventListener("timeupdate", (event) => {
      $.updateCurrentTime(event.target.currentTime);
    });
    $.player.addEventListener("loadedmetadata", (event) => {
      console.log($.player.duration);
      $.controls.progress.max = Math.round($.player.duration);
      $.updateDuration($.player.duration);
    });
  }
  removeListeners() {}

  generateTemplate() {
    const template = document.createElement("template");
    template.innerHTML = `
    <style>
    #media-player{
        background-color: #ffffff;
        background-image: linear-gradient(315deg, #ffffff 0%, #d7e1ec 74%);
        border-radius:10px;
        display:block;
        width:500px;
        padding:15px;
    }
    .margin-y{
        margin-top:15px;
        margin-bottom:15px;
    }
    #canvas-wrapper{
        border-radius:10px;
        overflow:hidden;
        height:150px;
        margin-bottom:10px;
    }
    canvas#equalizer{
        width:100%;
        height:100%;
    }
    div#progress-info-wrapper{
        display:flex;
        
    }
    div#progress-info-wrapper span#progress{
        flex-grow : 1;
    }
    div#progress-info-wrapper span#progress webaudio-slider{
        width:100%;
    }
    </style>

    <div id="media-player">
        <audio></audio>
        <div id="canvas-wrapper">
            <canvas id="equalizer"></canvas>
        </div>
        
        <div class="margin-y" id="progress-info-wrapper">
            <span id="progress">
                <webaudio-slider width="400" min="0" name="progress"></webaudio-slider>
            </span>
            <span id="info">
                <span name="current-time">00:00:00</span>/<span name="duration"></span>
            </span>
        </div>
        <div class="margin-y">
            <button name="toggle-play">Play</button>
            <button name="rollback">Retour à zero</button>
            <button name="add10sec">avancer 10s</button>
            <button name="minus10sec">reculer 10s</button>
            <button name="toggle-loop">loop</button>
        </div>
        <div class="margin-y">
        <webaudio-knob diameter="60" name="balance" src="./assets/imgs/Vintage_Knob.png" value="0" max="1" min="-1" step="0.01">Left   -   Right</webaudio-knob>

        <webaudio-knob diameter="60" name="volume" tooltip="Volume:%s" src="./assets/imgs/Vintage_Knob.png" min="0" max="1" step="0.01">Volume</webaudio-knob>

        <webaudio-knob name="vu" tooltip="Volume meter :%s" src="./assets/imgs/Vintage_VUMeter_2.png" min="0" max="80" step="0.01">Limit</webaudio-knob>
        </div>
    </div>
    `;
    return template;
  }

  togglePlay() {
    if (this.player.paused) {
      this.player.play();
      this.controls.togglePlay.innerText = "Pause";
    } else {
      this.player.pause();
      this.controls.togglePlay.innerText = "Play";
    }
  }
  setVolume(val = this.player.volume) {
    this.player.volume = val;
    this.controls.volume.setValue(val);
  }
  rollback() {
    this.player.currentTime = 0;
  }
  addPlayTime(val) {
    this.player.currentTime += val;
  }
  toggleLoop() {
    this.player.loop = !this.player.loop;
    this.controls.toggleLoop.innerHTML = this.player.loop ? "Loop(on)" : "Loop";
  }
  setBalance(val) {
    this.audioStereoPanner.pan.value = val;
  }
  updateDuration(val = this.player.duration) {
    this.controls.duration.innerHTML = this.secondsToDuration(val);
    this.controls.progress.setAttribute("max", val);
  }
  updateCurrentTime(val) {
    this.controls.currentTime.innerHTML = this.secondsToDuration(val);
    this.controls.progress.setValue(val);
  }
  setCurrentTime(val) {
    this.player.currentTime = val;
    this.updateCurrentTime(val);
  }
  secondsToDuration(val) {
    var sec_num = parseInt(val, 10); // don't forget the second param
    var hours = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - hours * 3600) / 60);
    var seconds = sec_num - hours * 3600 - minutes * 60;

    if (hours < 10) {
      hours = "0" + hours;
    }
    if (minutes < 10) {
      minutes = "0" + minutes;
    }
    if (seconds < 10) {
      seconds = "0" + seconds;
    }
    return (hours > 0 ? hours + ":" : "") + minutes + ":" + seconds;
  }
  animateEqualizer() {
    const eq = this.equalizer;
    window.requestAnimationFrame(() => this.animateEqualizer());
    var fbc_array, bar_count, bar_pos, bar_width, bar_height;

    fbc_array = new Uint8Array(eq.analyser.frequencyBinCount);
    bar_count = window.innerWidth / 2;

    eq.analyser.getByteFrequencyData(fbc_array);

    eq.ctx.clearRect(0, 0, eq.canvas.width, eq.canvas.height);
    eq.ctx.fillStyle = "#ffffff";

    for (var i = 0; i < bar_count; i++) {
      bar_pos = i * 2;
      bar_width = 2;
      bar_height = -(fbc_array[i] / 2);

      eq.ctx.fillRect(bar_pos, eq.canvas.height, bar_width, bar_height);
    }

    let sum = 0;
    for (const v of fbc_array) sum += v;

    this.controls.volumeMeter.setValue(sum / eq.analyser.frequencyBinCount);
  }
}

window.customElements.define("media-player", MediaPlayer);

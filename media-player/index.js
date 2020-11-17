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
      gain: this.shadowRoot.querySelector("webaudio-knob[name='gain']"),
      add10sec: this.shadowRoot.querySelector(
        "webaudio-switch[name='add10sec']"
      ),
      minus10sec: this.shadowRoot.querySelector(
        "webaudio-switch[name='minus10sec']"
      ),
      rollback: this.shadowRoot.querySelector(
        "webaudio-switch[name='rollback']"
      ),
      togglePlay: this.shadowRoot.querySelector(
        "webaudio-switch[name='toggle-play']"
      ),
      toggleLoop: this.shadowRoot.querySelector(
        "webaudio-switch[name='toggle-loop']"
      ),
      toggleVizType: this.shadowRoot.querySelector(
        "webaudio-switch[name='toggle-equalizer-type']"
      ),
    };

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContext();

    this.gainNode = this.audioContext.createGain();

    this.audioMediaSource = this.audioContext.createMediaElementSource(
      this.player
    );

    // handling balance
    this.audioStereoPanner = this.audioContext.createStereoPanner();
    this.audioMediaSource.connect(this.audioStereoPanner);
    this.audioMediaSource.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
    this.gainNode.gain.value = 1.5;
    var analyser = this.audioContext.createAnalyser();

    // handling equalizer
    const canvas = this.shadowRoot.querySelector("#equalizer");
    this.equalizer = {
      type: "bar",
      analyser: analyser,
      canvas: canvas,
      ctx: canvas.getContext("2d"),
    };
    this.audioStereoPanner.connect(this.audioContext.destination);
    this.audioMediaSource.connect(this.equalizer.analyser);
    this.equalizer.analyser.connect(this.audioContext.destination);
    this.renderSelectedEqualizerType();
    this.equalizer.animationId = window.requestAnimationFrame(() =>
      this.renderSelectedEqualizerType()
    );

    this.handleListeners();
    this.initAttributes();
  }
  disconnectedCallback() {
    this.handleListeners(true);
  }
  initAttributes() {
    var src = this.getAttribute("src");
    this.player.src = src;
    this.player.load();

    this.setVolume();
    this.setGain();
  }
  attributeChangedCallback(attr, oldValue, value) {
    // volume, current-time, gain, balance, equalize-type
    switch (attr) {
      case "volume":
        this.setVolume(value);
        break;
      case "current-time":
        this.setCurrentTime(value);
        break;
      case "equalize-type":
        this.toggleEqualizerType(value);
        break;
      case "gain":
        this.setGain(value);
        break;
      case "balance":
        this.setBalance(value);
        break;
      default:
        break;
    }
  }

  handleListeners(remove = false) {
    const $ = this;
    let addOrRemoveEventListener =
      (remove ? "remove" : "add") + "EventListener";
    $.controls.progress[addOrRemoveEventListener]("input", function (e) {
      $.setCurrentTime(e.target.value);
      if ($.player.paused) $.togglePlay();
    });
    $.controls.balance[addOrRemoveEventListener]("input", function (e) {
      $.setBalance(e.target.value);
    });
    $.controls.volume[addOrRemoveEventListener]("input", function (e) {
      $.setVolume(e.target.value);
    });
    $.controls.gain[addOrRemoveEventListener]("input", function (e) {
      $.setGain(e.target.value);
    });

    $.controls.toggleVizType[addOrRemoveEventListener]("click", function (e) {
      $.toggleEqualizerType();
    });
    $.controls.add10sec[addOrRemoveEventListener]("click", function (e) {
      $.addPlayTime(10);
    });
    $.controls.minus10sec[addOrRemoveEventListener]("click", function (e) {
      $.addPlayTime(-10);
    });
    $.controls.rollback[addOrRemoveEventListener]("click", function (e) {
      $.rollback();
    });

    $.controls.togglePlay[addOrRemoveEventListener]("click", (event) => {
      $.togglePlay();
    });
    $.controls.toggleLoop[addOrRemoveEventListener]("click", (event) => {
      $.toggleLoop();
    });
    $.player[addOrRemoveEventListener]("timeupdate", (event) => {
      $.updateCurrentTime(event.target.currentTime);
    });
    $.player[addOrRemoveEventListener]("loadedmetadata", (event) => {
      $.controls.progress.max = Math.round($.player.duration);
      $.updateDuration($.player.duration);
    });
  }
  removeListeners() {
    const $ = this[("toggleVizType", "add10sec")].map(function (c) {
      $.controls[c].removeListeners("click");
    });
  }

  generateTemplate() {
    const template = document.createElement("template");
    template.innerHTML = `
    <style>
    #media-player{
        margin:20px;
        color:white;
        background-color: #2a322a;
        background-image: linear-gradient(315deg, #2a322a 0%, #2f372f 74%);
        border-radius:10px;
        display:block;
        width:500px;
        padding:15px;
    }
    .margin-y{
        margin-top:15px;
        margin-bottom:15px;
    }
    #action-btns > span:nth-child(2){
      text-align:right;
    }
    #action-btns > span,#other-controls > span{
      flex-grow : 1;
    }
    #action-btns webaudio-switch{
      margin : 5px 5px;
    }
    #other-controls{
      align-items: center;
      text-align: center;
    }
    #action-btns,#other-controls{
      display:flex;
    }
    #canvas-wrapper{
        border-radius:10px;
        overflow:hidden;
        height:150px;
        margin-bottom:10px;
        position:relative;
    }
    #canvas-wrapper webaudio-switch > .webaudio-switch-body{
      transform : rotate(90deg);
    }
    #canvas-wrapper webaudio-switch{
      position:absolute;
      top:5px;
      right:5px;
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
          <webaudio-switch width="56" height="56" name="toggle-equalizer-type" src="./assets/imgs/switch_toggle.png" >Wave / Bar</webaudio-switch>
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
        <div class="margin-y" id="action-btns">
        <span>
        <webaudio-switch sprites="2" value="1" name="toggle-play" src="./assets/imgs/ob_button.png" >Play</webaudio-switch>
        <webaudio-switch sprites="1" value="1" name="rollback" src="./assets/imgs/ob_button.png" >Reset</webaudio-switch>
        <webaudio-switch sprites="2" value="1" name="toggle-loop" src="./assets/imgs/ob_button.png" >Loop</webaudio-switch>
        </span>
        <span>
        <webaudio-switch sprites="1" value="1" name="minus10sec" src="./assets/imgs/ob_button.png" >-10 sec</webaudio-switch>
        <webaudio-switch sprites="1" value="1" name="add10sec" src="./assets/imgs/ob_button.png" >+10 sec</webaudio-switch>
        </span>
        </div>
        <div class="margin-y" id="other-controls">
          <span>
          <webaudio-knob diameter="60" name="balance" src="./assets/imgs/Vintage_Knob.png" value="0" max="1" min="-1" step="0.01">Left   -   Right</webaudio-knob>
          
          <webaudio-knob diameter="60" name="volume" tooltip="Volume:%s" src="./assets/imgs/Vintage_Knob.png" min="0" max="1" step="0.01">Volume</webaudio-knob>
          
          <webaudio-knob diameter="60" name="gain" tooltip="Gain:%s" src="./assets/imgs/Vintage_Knob.png" min="0" max="3" step="0.01">Gain</webaudio-knob>
          </span>
          <span>
          <webaudio-knob enable="0" name="vu" tooltip="Volume meter :%s" src="./assets/imgs/Vintage_VUMeter_2.png" min="0" max="80" step="0.01">Limit</webaudio-knob>
          </span>
        </div>
    </div>
    `;
    return template;
  }

  togglePlay() {
    if (this.player.paused) {
      this.player.play();
      this.controls.togglePlay.innerText = "Pause";
      this.renderSelectedEqualizerType();
    } else {
      this.player.pause();
      this.controls.togglePlay.innerText = "Play";
    }
  }
  setGain(val = 1) {
    val = parseFloat(val + "");
    if (val < 0 || val > 3) throw new Error("Gain provided is not valid");
    this.gainNode.gain.value = val;
    this.controls.gain.setValue(val);
  }
  setVolume(val = this.player.volume) {
    val = Math.abs(parseFloat(val + ""));
    if (val > 1) throw new Error("Volume provided is not valid");
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
  }
  setBalance(val) {
    val = parseFloat(val + "");
    if (val > 1 || val < -1) throw new Error("Balance provided is not valid");
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
  setCurrentTime(val = 0) {
    val = Math.abs(parseFloat(val + ""));
    if (val > this.player.duration)
      throw new Error("Current time provided is not valid");

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
  renderSelectedEqualizerType() {
    if (this.player.paused) {
      window.cancelAnimationFrame(this.equalizer.animationId);
      return;
    }
    if (this.equalizer.type == "bar") this.renderBarEqualizer();
    else this.renderWaveEqualizer(() => this.renderSelectedEqualizerType());
  }
  renderBarEqualizer() {
    const eq = this.equalizer;

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
    this.equalizer.animationId = window.requestAnimationFrame(() =>
      this.renderSelectedEqualizerType()
    );
  }
  renderWaveEqualizer() {
    this.equalizer.animationId = window.requestAnimationFrame(() =>
      this.renderSelectedEqualizerType()
    );
    const eq = this.equalizer;
    let fbc_array = new Uint8Array(eq.analyser.frequencyBinCount);
    eq.analyser.getByteFrequencyData(fbc_array);
    eq.ctx.clearRect(0, 0, eq.canvas.width, eq.canvas.height);
    eq.ctx.lineWidth = 1;
    eq.ctx.strokeStyle = "blue";
    eq.ctx.beginPath();

    let sliceWidth = eq.canvas.width / 255;
    let x = 0;
    for (var i = 0; i < eq.analyser.frequencyBinCount; i++) {
      var v = fbc_array[i];
      var y = v;
      if (i === 0) eq.ctx.moveTo(x, y);
      else eq.ctx.lineTo(x, y);

      x += sliceWidth;
    }

    eq.ctx.lineTo(eq.canvas.width, eq.canvas.height / 2);
    eq.ctx.stroke();
  }
  toggleEqualizerType(val = "") {
    if (!!val) {
      val = val.trim().toLowerCase();
      if (!["bar", "wave"].includes(val))
        throw new Error("Equalizer type provided not valid");
      this.equalizer.type = val;
    } else this.equalizer.type = this.equalizer.type == "bar" ? "wave" : "bar";
  }
}
window.customElements.define("media-player", MediaPlayer);

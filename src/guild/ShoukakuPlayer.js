const EventEmitter = require('events');
const { ShoukakuPlayOptions, ShoukakuStatus } = require('../constants/ShoukakuConstants.js');
const util = require('../util/ShoukakuUtil.js');
const ShoukakuLink = require('./ShoukakuLink.js');
const ShoukakuFilter = require('../constants/ShoukakuFilter.js');
const ShoukakuError = require('../constants/ShoukakuError.js');
const ShoukakuTrack = require('../constants/ShoukakuTrack.js');

const endEvents = ['end', 'closed', 'error', 'trackException', 'nodeDisconnect'];

/**
 * ShoukakuPlayer, used to control the player on the guildused to control the player on the guild.
 * @class ShoukakuPlayer
 * @extends {EventEmitter}
 */
class ShoukakuPlayer extends EventEmitter {
    /**
     * @param  {ShoukakuSocket} node The node that governs this player.
     * @param  {Guild} guild A Discord.JS Guild Object.
     */
    constructor(node, guild) {
        super();
        /**
         * The Voice Connection of this Player.
         * @type {ShoukakuLink}
         */
        this.voiceConnection = new ShoukakuLink(node, this, guild);
        /**
         * The Track that is currently being played by this player.
         * @type {?string}
         */
        this.track = null;
        /**
         * If this player is currently paused.
         * @type {boolean}
         */
        this.paused = false;
        /**
         * The current postion in ms of this player
         * @type {number}
         */
        this.position = 0;
        /**
         * Current filter settings for this player
         * @type {ShoukakuFilter}
         */
        this.filters = new ShoukakuFilter();
    }

    /**
     * Emitted when the Lavalink Player emits a TrackEnd or TrackStuck event.
     * @event ShoukakuPlayer#end
     * @param {Object} reason
     * @memberOf ShoukakuPlayer
     */
    /**
     * Emitted when the voiceConnection got closed.
     * @event ShoukakuPlayer#closed
     * @param {Object} reason
     * @memberOf ShoukakuPlayer
     * @example
     * // <Player> is your ShoukakuPlayer instance
     * <Player>.on('closed', (reason) => {
     *   <Player>.disconnect();
     * })
     */
    /**
     * Emitted when this library encounters an error in ShoukakuPlayer or ShoukakuLink class. MUST BE HANDLED.
     * @event ShoukakuPlayer#error
     * @param {Error} error The error encountered.
     * @memberOf ShoukakuPlayer
     * @example
     * // <Player> is your ShoukakuPlayer instance
     * <Player>.on('error', (error) => {
     *   console.error(error);
     *   <Player>.disconnect();
     * })
     */
    /**
     * Emitted when this player's node was disconnected. MUST BE HANDLED.
     * @event ShoukakuPlayer#nodeDisconnect
     * @param {string} name The name of the node that disconnected.
     * @memberOf ShoukakuPlayer
     * @example
     * // <Player> is your ShoukakuPlayer instance
     * <Player>.on('nodeDisconnect', (name) => {
     *   console.log(`Node ${name} which governs this player disconnected.`);
     *   <Player>.disconnect();
     * })
     */
    /**
     * Emitted when the Lavalink Player emits a TrackStartEvent event. Optional.
     * @event ShoukakuPlayer#start
     * @param {Object} data
     * @memberOf ShoukakuPlayer
     */
    /**
     * Emitted when Lavalink encounters an error on playing the song. Optional.
     * @event ShoukakuPlayer#trackException
     * @param {Object} reason
     * @memberOf ShoukakuPlayer
     */
    /**
     * Emitted when the Shoukaku Player resumes the session by resending the playing data. Optional.
     * @event ShoukakuPlayer#resumed
     * @memberOf ShoukakuPlayer
     */
    /**
     * Emitted when Lavalink gives a Player Update event. Optional.
     * @event ShoukakuPlayer#playerUpdate
     * @param {Object} data
     * @memberOf ShoukakuPlayer
     */

    /**
     * Eventually Connects the Bot to the voice channel in the guild. This is used internally and must not be used to connect players. Use `<ShoukakuSocket>.joinVoiceChannel()` instead.
     * @memberOf ShoukakuPlayer
     * @returns {void}
     */
    connect(options, callback) {
        this.voiceConnection.connect(options, callback);
    }
    /**
     * Eventually Disconnects the VoiceConnection & Removes the player from a Guild. Could be also used to clean up player remnants from unexpected events.
     * @memberOf ShoukakuPlayer
     * @returns {void}
     */
    disconnect() {
        this.voiceConnection.disconnect();
    }
    /**
     * Moves this Player & VoiceConnection to another lavalink node you specified.
     * @param {string} name Name of the Node you want to move to.
     * @memberOf ShoukakuPlayer
     * @returns {Promise<ShoukakuPlayer>}
     */
    async moveToNode(name) {
        const node = this.voiceConnection.node.shoukaku.nodes.get(name);
        if (!node || node.name === this.voiceConnection.node.name) return this;
        if (node.state !== ShoukakuStatus.CONNECTED)
            throw new ShoukakuError('The node you specified is not ready.');
        await this.voiceConnection.move(node);
        return this;
    }
    /**
     * Plays a track.
     * @param {string|ShoukakuTrack} track The Base64 track from the Lavalink Rest API or a ShoukakuTrack.
     * @param {ShoukakuPlayOptions} [options=ShoukakuPlayOptions] Used if you want to put a custom track start or end time.
     * @memberOf ShoukakuPlayer
     * @returns {Promise<ShoukakuPlayer>}
     */
    async playTrack(input, options) {
        if (!input)
            throw new ShoukakuError('No track given to play');
        if (input instanceof ShoukakuTrack) input = input.track;
        options = util.mergeDefault(ShoukakuPlayOptions, options);
        const { noReplace, startTime, endTime } = options;
        const payload = {
            op: 'play',
            guildId: this.voiceConnection.guildID,
            track: input,
            noReplace
        };
        if (startTime) payload.startTime = startTime;
        if (endTime) payload.endTime = endTime;
        await this.voiceConnection.node.send(payload);
        return this;
    }
    /**
     * Stops the player from playing.
     * @memberOf ShoukakuPlayer
     * @returns {Promise<ShoukakuPlayer>}
     */
    async stopTrack() {
        this.position = 0;
        await this.voiceConnection.node.send({
            op: 'stop',
            guildId: this.voiceConnection.guildID
        });
        return this;
    }
    /**
     * Pauses / Unpauses the player
     * @param {boolean} [pause=true] true to pause, false to unpause
     * @memberOf ShoukakuPlayer
     * @returns {Promise<ShoukakuPlayer>}
     */
    async setPaused(pause = true) {
        if (pause === this.paused) return this;
        await this.voiceConnection.node.send({
            op: 'pause',
            guildId: this.voiceConnection.guildID,
            pause
        });
        this.paused = pause;
        return this;
    }
    /**
     * Seeks your player to the time you want
     * @param {number} position position in MS you want to seek to.
     * @memberOf ShoukakuPlayer
     * @returns {Promise<ShoukakuPlayer>}
     */
    async seekTo(position) {
        if (!Number.isInteger(position))
            throw new ShoukakuError('Please input a valid number for position');
        await this.voiceConnection.node.send({
            op: 'seek',
            guildId: this.voiceConnection.guildID,
            position
        });
        return this;
    }
    /**
     * Sets the playback volume of your lavalink player
     * @param {number} volume The new volume you want to set on the player.
     * @memberOf ShoukakuPlayer
     * @returns {Promise<ShoukakuPlayer>}
     */
    async setVolume(volume) {
        if (!Number.isInteger(volume)) 
           throw new ShoukakuError('Please input a valid number for volume');
        volume = Math.min(5, Math.max(0, volume));
        if (volume === this.filters.volume) return this;
        this.filters.volume = volume;
        await this.updateFilters();
        return this;
    }
    /**
     * Sets the equalizer of your lavalink player
     * @param {Array<ShoukakuConstants#EqualizerBand>} bands An array of Lavalink bands.
     * @memberOf ShoukakuPlayer
     * @returns {Promise<ShoukakuPlayer>}
     */
    async setEqualizer(bands) {
        if (!bands || !Array.isArray(bands))
            throw new ShoukakuError('No bands, or the band you gave isn\'t an array');
        this.filters.equalizer = bands;
        await this.updateFilters();
        return this;
    }
    /**
     * Sets the karaoke effect of your lavalink player
     * @param {ShoukakuConstants#KaraokeValue} karaokeValue Karaoke settings for this playback
     * @memberOf ShoukakuPlayer
     * @returns {Promise<ShoukakuPlayer>}
     */
    async setKaraoke(karaokeValue) {
        if (!karaokeValue)
            throw new ShoukakuError('Please input the Karaoke Settings for karaoke');
        const keys = Object.keys(karaokeValue);
        this.filters.karaoke = {};
        for (const key of keys) {
            this.filters.karaoke[key] = karaokeValue[key];
        }
        await this.updateFilters();
        return this;
    }
    /**
     * Sets the timescale effect of your lavalink player
     * @param {ShoukakuConstants#TimescaleValue} timescaleValue Timescale settings for this playback
     * @memberOf ShoukakuPlayer
     * @returns {Promise<ShoukakuPlayer>}
     */
    async setTimescale(timescaleValue) {
        if (!timescaleValue)
            throw new ShoukakuError('Please input the Timescale Settings for timescale');
        const keys = Object.keys(timescaleValue);
        this.filters.timescale = {};
        for (const key of keys) {
            this.filters.timescale[key] = timescaleValue[key];
        }
        await this.updateFilters();
        return this;
    }
    /**
     * Sets the tremolo effect of your lavalink player
     * @param {ShoukakuConstants#TremoloValue} tremoloValue Tremolo settings for this playback
     * @memberOf ShoukakuPlayer
     * @returns {Promise<ShoukakuPlayer>}
     */
    async setTremolo(tremoloValue) {
        if (!tremoloValue)
            throw new ShoukakuError('Please input the Tremolo Settings for tremolo');
        const keys = Object.keys(tremoloValue);
        this.filters.tremolo = {};
        for (const key of keys) {
            this.filters.tremolo[key] = tremoloValue[key];
        }
        await this.updateFilters();
        return this;
    }
    /**
     * Sets the vibrato effect of your lavalink player
     * @param {ShoukakuConstants#VibratoValue} vibratoValue Vibrato settings for this playback
     * @memberOf ShoukakuPlayer
     * @returns {Promise<ShoukakuPlayer>}
     */
    async setVibrato(vibratoValue) {
        if (!vibratoValue)
            throw new ShoukakuError('Please input the Vibrato Settings for tremolo');
        const keys = Object.keys(vibratoValue);
        this.filters.vibrato = {};
        for (const key of keys) {
            this.filters.vibrato[key] = vibratoValue[key];
        }
        await this.updateFilters();
        return this;
    }

    async clearFilters() {
        this.filters.vibrato = null;
        this.filters.tremolo = null;
        this.filters.timescale = null;
        this.filters.karaoke = null;
        this.filters.volume = 1.0;
        this.filters.equalizer = [];

        await this.voiceConnection.node.send({
            op: 'filters',
            guildId: this.voiceConnection.guildID
        });
        return this;
    }

    async updateFilters() {
        const { volume, equalizer, karaoke, timescale, tremolo, vibrato } = this.filters;
        await this.voiceConnection.node.send({
            op: 'filters',
            guildId: this.voiceConnection.guildID,
            volume,
            equalizer,
            karaoke,
            timescale,
            tremolo,
            vibrato
        });
        return this;
    }

    async resume() {
        try {
            if (this.filters.equalizer.length) await this.setEqualizer(this.filters.equalizer);
            if (this.volume !== 100) await this.setVolume(this.volume);
            if (!this.track) {
                this.emit('end', { type: 'ShoukakuResumeEvent', guildId: this.voiceConnection.guildID, reason: 'Tried to resume, but there is no track to use' });
            } else {
                await this.playTrack(this.track, { startTime: this.position });
                this.emit('resumed', null);
            }
        } catch (error) {
            this.emit('error', error);
        }
    }

    reset(cleanBand = false) {
        this.track = null;
        this.position = 0;
        if (cleanBand) this.filters.equalizer.length = 0;
    }

    emit(event, data) {
        if (endEvents.includes(event)) {
            event === 'nodeDisconnect' ? this.reset(true) : this.reset();
            return super.emit(event, data);
        }
        if (event === 'start') this.track = data.track;
        if (event === 'playerUpdate') this.position = data.position;
        return super.emit(event, data);
    }
}
module.exports = ShoukakuPlayer;

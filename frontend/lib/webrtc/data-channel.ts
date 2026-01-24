/**
 * DataChannel Wrapper for P2P Drawing Communication
 *
 * Provides a typed interface for sending and receiving
 * binary stroke data over WebRTC DataChannel.
 */

export type DataChannelState = 'connecting' | 'open' | 'closing' | 'closed';

export interface DataChannelConfig {
  ordered: boolean;
  maxRetransmits?: number;
  maxPacketLifeTime?: number;
}

export const DEFAULT_CHANNEL_CONFIG: DataChannelConfig = {
  ordered: true,
  maxRetransmits: 3,
};

type MessageHandler = (data: ArrayBuffer) => void;
type StateChangeHandler = (state: DataChannelState) => void;

export class DataChannelWrapper {
  private channel: RTCDataChannel | null = null;
  private messageHandler: MessageHandler | null = null;
  private stateChangeHandler: StateChangeHandler | null = null;
  private pendingMessages: ArrayBuffer[] = [];

  constructor(channel?: RTCDataChannel) {
    if (channel) {
      this.setChannel(channel);
    }
  }

  /**
   * Set or replace the underlying RTCDataChannel
   */
  setChannel(channel: RTCDataChannel): void {
    if (this.channel) {
      this.cleanup();
    }

    this.channel = channel;
    this.channel.binaryType = 'arraybuffer';

    this.channel.onopen = () => {
      this.stateChangeHandler?.('open');
      this.flushPendingMessages();
    };

    this.channel.onclose = () => {
      this.stateChangeHandler?.('closed');
    };

    this.channel.onerror = (event) => {
      console.error('DataChannel error:', event);
    };

    this.channel.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        this.messageHandler?.(event.data);
      }
    };
  }

  /**
   * Send binary data through the channel
   */
  send(data: ArrayBuffer): boolean {
    if (!this.channel) {
      this.pendingMessages.push(data);
      return false;
    }

    if (this.channel.readyState !== 'open') {
      this.pendingMessages.push(data);
      return false;
    }

    try {
      this.channel.send(data);
      return true;
    } catch (error) {
      console.error('Failed to send data:', error);
      return false;
    }
  }

  /**
   * Register message handler
   */
  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  /**
   * Register state change handler
   */
  onStateChange(handler: StateChangeHandler): void {
    this.stateChangeHandler = handler;
  }

  /**
   * Get current channel state
   */
  getState(): DataChannelState {
    if (!this.channel) return 'closed';
    return this.channel.readyState as DataChannelState;
  }

  /**
   * Check if channel is ready for sending
   */
  isReady(): boolean {
    return this.channel?.readyState === 'open';
  }

  /**
   * Close the channel
   */
  close(): void {
    if (this.channel) {
      this.channel.close();
    }
    this.cleanup();
  }

  private flushPendingMessages(): void {
    while (this.pendingMessages.length > 0 && this.isReady()) {
      const message = this.pendingMessages.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  private cleanup(): void {
    if (this.channel) {
      this.channel.onopen = null;
      this.channel.onclose = null;
      this.channel.onerror = null;
      this.channel.onmessage = null;
      this.channel = null;
    }
  }
}

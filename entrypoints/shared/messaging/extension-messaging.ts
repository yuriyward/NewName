/**
 * Central extension messaging protocol using @webext-core/messaging
 */
import { defineExtensionMessaging } from '@webext-core/messaging';

export interface ExtensionMessagingProtocol {
  /**
   * Resolve runtime context metadata for the current script execution environment.
   */
  resolveRuntimeContext(): {
    tabId?: number;
    frameId?: number;
    url?: string | null;
  };
}

const extensionMessaging =
  defineExtensionMessaging<ExtensionMessagingProtocol>();

export const {
  sendMessage: sendExtensionMessage,
  onMessage: onExtensionMessage,
} = extensionMessaging;

"use strict";

module.exports = {
    Event: {
        WebSocket: {
            CaptchaSubmittedEvent: 'CaptchaSubmittedEvent',
            RemoveCaptchaEvent: 'RemoveCaptchaEvent',
            AddCaptchaEvent: 'AddCaptchaEvent'
        },
        TCP: {
            ClientAuthenticateEvent: 'ClientAuthenticateEvent',
            ClientAuthenticatedEvent: 'ClientAuthenticatedEvent',
            CaptchaRequestEvent: 'CaptchaRequestEvent',
            CaptchaResponseEvent: 'CaptchaResponseEvent'
        }
    }
};

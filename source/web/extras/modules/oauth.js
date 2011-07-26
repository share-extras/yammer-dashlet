/**
 * Copyright (C) 2010-2011 Share Extras contributors.
 */

/**
* Extras root namespace.
* 
* @namespace Extras
*/
if (typeof Extras == "undefined" || !Extras)
{
   var Extras = {};
}

/**
 * OAuth service helper
 * 
 * @class OAuthHelper
 * @namespace Extras
 * @author Will Abson
 */
(function()
{
   /**
    * Alfresco Slingshot aliases
    */
   var $html = Alfresco.util.encodeHTML,
      $combine = Alfresco.util.combinePaths;

   /**
    * Preferences
    */
   var PREFS_BASE = "org.alfresco.share.oauth.",
       PREF_DATA = "data",
       PREF_TOKEN = PREF_DATA + ".token",
       PREF_SECRET = PREF_DATA + ".secret";

   /**
    * Dashboard OAuthHelper constructor.
    * 
    * @return {OAuthHelper} The new helper instance
    * @constructor
    */
   Extras.OAuthHelper = function OAuthHelper_constructor()
   {
      return this;
   };

   /**
    * Add class implementation
    */
   Extras.OAuthHelper.prototype =
   {
       /**
        * Object container for initialization options
        *
        * @property options
        * @type object
        */
       options:
       {
           /**
            * OAuth client key
            * 
            * @property consumerKey
            * @type string
            * @default ""
            */
           consumerKey: "",

           /**
            * OAuth client secret
            * 
            * @property consumerSecret
            * @type string
            * @default ""
            */
           consumerSecret: "",
           
           /**
            * Unique ID for the OAuth provider, for storing token data against
            * 
            * @property providerId
            * @type string
            * @default ""
            */
           providerId: "",
           
           /**
            * Method used to sign OAuth requests
            * 
            * @property signatureMethod
            * @type string
            * @default "PLAINTEXT"
            */
           signatureMethod: "PLAINTEXT",

           /**
            * Name of the Surf endpoint used to access the remote API protected by OAuth. Must be configured in the Surf layer.
            * 
            * @property endpointId
            * @type string
            * @default ""
            */
           endpointId: ""
       },
       
       // TODO Support multiple credentials, not just the access token and secret
       
      /**
       * OAuth access token
       * 
       * @property accessToken
       * @type string
       * @default null
       */
      accessToken: null,

      /**
       * OAuth access secret
       * 
       * @property secret
       * @type string
       * @default null
       */
      secret: null,
      
      /**
       * Set multiple initialization options at once.
       * 
       * @method setOptions
       * @param obj {object} Object literal specifying a set of options
       * @return {object} returns 'this' for method chaining
       */
      setOptions: function OAuth_setOptions(obj)
      {
          this.options = YAHOO.lang.merge(this.options, obj);
          return this;
      },
      
      /**
       * Set up the OAuth helper. Connects to the user storage and populates the access token
       * and secret, if they exist.
       * 
       * @method init
       * @param obj {object}  Object literal defining two handler functions, 'successHandler' and 'failureHandler'.
       *    Each handler is another object defining 'fn' and 'scope' properties.
       */
      init: function OAuth_init(obj)
      {
          // Preferences service
          this.preferences = new Alfresco.service.Preferences();
          this.loadCredentials(obj);
      },
      
      /**
       * Boolean indicating whether or not the user has a valid OAuth token
       * 
       * @return {boolean} True if a valid token exists, false otherwise
       */
      isConnected: function OAuth_isConnected()
      {
          // TODO check that the token is valid as well as that it just exists
          return this.accessToken != null && this.accessToken != "" && 
              this.secret != null && this.secret != "";
      },
      
      /**
       * Authenticate to the OAuth service
       * 
       * @method authenticate
       * @param {object} Object literal defining sucessHandler, failureHandler, verifyHandler functions
       */
      authenticate: function OAuth_authenticate(obj)
      {
          this.requestToken(obj);
      },
      
      /**
       * Request a request token and request secret by passing the consumer key
       * 
       * @method requestToken
       * @param {object} Object literal defining sucessHandler, failureHandler, verifyHandler functions, to be passed
       *    to the handlers
       */
      requestToken: function OAuth_requestToken(obj)
      {
          var now = new Date();
              nonce = "545746008",
              requestTokenUrl = Alfresco.constants.URL_CONTEXT + "proxy/" + this.options.endpointId + "/oauth/request_token",
              authStr = "oauth_consumer_key=\"" + this.options.consumerKey + "\",oauth_signature_method=\"" + 
              this.options.signatureMethod + "\"" +
              ",oauth_timestamp=\"" + now.getTime() + "\",oauth_nonce=\"" + nonce + "\",oauth_signature=\"" + 
              this.options.consumerSecret + "%26\"";
          
          var callback = 
          {
              success: this.requestTokenSuccess,
              failure: this.requestTokenFailure,
              scope: this,
              argument: {
                  successHandler: obj.successHandler,
                  failureHandler: obj.failureHandler,
                  verifyHandler: obj.verifyHandler
              }
          };
          
          YAHOO.util.Connect.initHeader("Auth", "OAuth " + authStr);
          YAHOO.util.Connect.asyncRequest("POST", requestTokenUrl, callback, "");
      },
      
      /**
       * Success handler for request token
       * 
       * @method requestTokenSuccess
       * @param o {object} Server response object
       */
      requestTokenSuccess: function OAuth_requestTokenSuccess(o)
      {
          YAHOO.util.Connect.resetDefaultHeaders();
          // TODO Check resp code is 200
          var tokens = o.responseText.split("&"),
              respData = {}, pair;
          for ( var i = 0; i < tokens.length; i++)
          {
              pair = tokens[i].split("=");
              if (pair.length == 2)
              {
                  respData[pair[0]] = pair[1];
              }
          }
          // TODO Check respData.oauth_callback_confirmed="true"
          
          var callbacks =  {
              successHandler: o.argument.successHandler,
              failureHandler: o.argument.failureHandler
          };
          
          // Call the verify handler which should prompt the user for the verifier code
          var verifyHandler = o.argument.verifyHandler;
          if (verifyHandler && verifyHandler.fn && typeof (verifyHandler.fn) == "function")
          {
              var me = this;
              verifyHandler.fn.call(verifyHandler.scope, {
                  authToken: respData.oauth_token,
                  onComplete: function OAuth_onComplete(verifier) // The callback function should invoke this in turn when the user has input the code
                  {
                      // Call requestAccessToken with the correct scope, using a closure for 'this'
                      me.requestAccessToken.apply(me, [respData.oauth_token, respData.oauth_token_secret, verifier, callbacks]);
                  }
              });
          }
      },
      
      /**
       * Failure handler for request token
       * 
       * @method requestTokenFailure
       * @param o {object} Server response object
       */
      requestTokenFailure: function OAuth_requestTokenFailure(o)
      {
          Alfresco.util.PopupManager.displayMessage({
              text: "Fail"
          });
          YAHOO.util.Connect.resetDefaultHeaders();
      },
      
      /**
       * Request a permanent access token. The temporary request token is exchanged for an access token, which
       * is then stored.
       * 
       * @method requestAccessToken
       * @param token {string} Request token
       * @param secret {string} Request secret
       * @param verifier {string} OAuth verifier code
       * @param callbacks {object} Object literal defining two handler functions, 'successHandler' and 'failureHandler'.
       */
      requestAccessToken: function OAuth_requestAccessToken(token, secret, verifier, callbacks)
      {
          var now = new Date();
              nonce = "545746009",
              requestTokenUrl = Alfresco.constants.URL_CONTEXT + "proxy/" + this.options.endpointId + "/oauth/access_token",
              authStr = "oauth_consumer_key=\"" + this.options.consumerKey + "\",oauth_token=\"" + token + 
              "\",oauth_signature_method=\"" + 
              this.options.signatureMethod + "\"" + ",oauth_timestamp=\"" + now.getTime() + "\",oauth_nonce=\"" + nonce + 
              "\",oauth_verifier=\"" + verifier + "\",oauth_signature=\"" + 
              this.options.consumerSecret + "%26" + secret + "\"";

          var callback = 
          {
              success: this.requestAccessTokenSuccess,
              failure: this.requestAccessTokenFailure,
              scope: this,
              argument: {
                  successHandler: callbacks.successHandler,
                  failureHandler: callbacks.failureHandler
              }
          };
          
          YAHOO.util.Connect.initHeader("Auth", "OAuth " + authStr);
          YAHOO.util.Connect.asyncRequest("POST", requestTokenUrl, callback, "");
      },
      
      /**
       * Success handler for request permanent access token
       * 
       * @method requestAccessTokenSuccess
       * @param o {object} Server response object
       */
      requestAccessTokenSuccess: function OAuth_requestAccessTokenSuccess(o)
      {
          YAHOO.util.Connect.resetDefaultHeaders();
          // TODO Check resp code is 200
          var tokens = o.responseText.split("&"),
              respData = {}, pair;
          for ( var i = 0; i < tokens.length; i++)
          {
              pair = tokens[i].split("=");
              if (pair.length == 2)
              {
                  respData[pair[0]] = pair[1];
              }
          }
          this.accessToken = respData.oauth_token;
          this.secret = respData.oauth_token_secret;
          
          this.saveCredentials();
          
          // Call the success callback
          var successHandler = o.argument.successHandler;
          if (successHandler && successHandler.fn && typeof (successHandler.fn) == "function")
          {
              successHandler.fn.call(successHandler.scope);
          }
      },
      
      /**
       * Failure handler for request permanent access token
       * 
       * @method requestAccessTokenFailure
       * @param o {object} Server response object
       */
      requestAccessTokenFailure: function OAuth_requestAccessTokenFailure(o)
      {
          YAHOO.util.Connect.resetDefaultHeaders();
          Alfresco.util.PopupManager.displayMessage({
              text: "Fail"
          });
      },
      
      /**
       * Clear the cached access credentials
       * 
       * @method clearCredentials
       */
      clearCredentials: function OAuth_clearCredentials()
      {
          this.accessToken = "";
          this.secret = "";
      },

      /**
       * Load the access credentials from persistant user-specific storage. Currently the preferences
       * service is used as storage.
       * 
       * @method loadCredentials
       * @param obj {object}  Object literal defining two handler functions, 'successHandler' and 'failureHandler'.
       *    Each handler is another object defining 'fn' and 'scope' properties.
       */
      loadCredentials: function OAuth_saveCredentials(obj)
      {
          this.preferences.request(PREFS_BASE + this.options.providerId + "." + PREF_DATA, {
              successCallback: {
                  fn: function (p_resp) {
                      var json = p_resp.json;
                      if (json != null && json.org != null)
                      {
                          var credentials = json.org.alfresco.share.oauth[this.options.providerId].data;
                          if (credentials != null)
                          {
                              // Token has been found
                              this.accessToken = credentials.token;
                              this.secret = credentials.secret;

                              // Call the success callback
                              var successHandler =  obj ? obj.successHandler : null;
                              if (successHandler && successHandler.fn && typeof (successHandler.fn) == "function")
                              {
                                  successHandler.fn.call(successHandler.scope, this.isConnected());
                              }
                          }
                      }
                  },
                  scope: this
              },
              failureCallback: {
                  fn: function (p_resp) {
                      // Call the failure callback
                      var failureHandler = obj ? obj.failureHandler : null;
                      if (failureHandler && failureHandler.fn && typeof (failureHandler.fn) == "function")
                      {
                          failureHandler.fn.call(failureHandler.scope, this.isConnected());
                      }
                  },
                  scope: this
              }
          });
      },

      /**
       * Save the access credentials to persistant, user-specific storage. Currently the preferences
       * service is used as storage.
       * 
       * @method saveCredentials
       * @param obj {object}  Object literal defining two handler functions, 'successHandler' and 'failureHandler'.
       *    Each handler is another object defining 'fn' and 'scope' properties.
       */
      saveCredentials: function OAuth_saveCredentials(obj)
      {
          // Chain the set() calls using a callback, as they don't seem to be thread-safe
          this.preferences.set(PREFS_BASE + this.options.providerId + "." + PREF_TOKEN, this.accessToken, {
              successCallback: {
                  fn: function OAuth_saveCredentials_onPrefsSuccess() {
                      this.preferences.set(PREFS_BASE + this.options.providerId + "." + PREF_SECRET, this.secret, {
                          successCallback: {
                              fn: function (p_resp)
                              {
                                  // Call the success callback
                                  var successHandler = obj ? obj.successHandler : null;
                                  if (successHandler && successHandler.fn && typeof (successHandler.fn) == "function")
                                  {
                                      successHandler.fn.call(successHandler.scope);
                                  }
                              },
                              scope: this
                          },
                          failureCallback: {
                              fn: function (p_resp) {
                                  // Call the failure callback
                                  var failureHandler = obj ?  obj.failureHandler: null;
                                  if (failureHandler && failureHandler.fn && typeof (failureHandler.fn) == "function")
                                  {
                                      failureHandler.fn.call(failureHandler.scope);
                                  }
                              },
                              scope: this
                          }
                      });
                  },
                  scope: this
              },
              failureCallback: {
                  fn: function (p_resp) {
                      // Call the failure callback
                      var failureHandler =  obj ? obj.failureHandler : null;
                      if (failureHandler && failureHandler.fn && typeof (failureHandler.fn) == "function")
                      {
                          failureHandler.fn.call(failureHandler.scope);
                      }
                  },
                  scope: this
              }
          });
      },
      
      /**
       * Make a request to the API, signing using the OAuth credentials as necessary
       * 
       * @method request
       * @param obj {object} Object literal defining two handler functions, 'success' and 'failure', plus a 'scope' object
       */
      request: function OAuth_request(obj)
      {
          var now = new Date();
              nonce = "545746009",
              requestUrl = Alfresco.constants.URL_CONTEXT + "proxy/" + this.options.endpointId + obj.url,
              authStr = "oauth_consumer_key=\"" + this.options.consumerKey + "\",oauth_token=\"" + this.accessToken + 
              "\",oauth_signature_method=\"" + 
              this.options.signatureMethod + "\"" + ",oauth_timestamp=\"" + now.getTime() + "\",oauth_nonce=\"" + nonce + 
              "\",oauth_signature=\"" + this.options.consumerSecret + "%26" + this.secret + "\"";

          var callback = 
          {
              success: obj.success,
              failure: obj.failure,
              scope: obj.scope
          };
          
          YAHOO.util.Connect.initHeader("Auth", "OAuth " + authStr);
          YAHOO.util.Connect.asyncRequest(obj.method || "GET", requestUrl, callback, "");
      }
      
   };
})();

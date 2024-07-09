/* global document */
/* global jQuery */
/* global wyr */

// global namespace
if ( typeof window.wyr === 'undefined' ) {
    window.wyr = {};
}

/********
 *
 * Core
 *
 *******/

(function ($, ctx) {

    'use strict';

    /** VARS *************************/

    ctx.config = $.parseJSON(window.wyr_front_config);

    if (!ctx.config) {
        throw 'WYR Error: Global config is not defined!';
    }

    /** FUNCTIONS ********************/

    ctx.isTouchDevice = function () {
        return ('ontouchstart' in window) || navigator.msMaxTouchPoints;
    };

    ctx.createCookie =  function (name, value, days) {
        var expires;

        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = '; expires=' + date.toUTCString();
        }
        else {
            expires = '';
        }

        document.cookie = name.concat('=', value, expires, '; path=/');
    };

    ctx.readCookie = function (name) {
        var nameEQ = name + '=';
        var ca = document.cookie.split(';');

        for(var i = 0; i < ca.length; i += 1) {
            var c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1,c.length);
            }

            if (c.indexOf(nameEQ) === 0) {
                return c.substring(nameEQ.length,c.length);
            }
        }

        return null;
    };

    ctx.deleteCookie = function (name) {
        ctx.createCookie(name, '', -1);
    };

})(jQuery, wyr);

/*********************
 *
 * Module: Reactions
 *
 ********************/

(function ($, ctx) {

    'use strict';

    var selectors = {
        'wrapper':      '.wyr-reaction-items',
        'link':         '.wyr-reaction',
        'voted':        '.wyr-reaction-voted',
        'value':        '.wyr-reaction-value',
        'bar':          '.wyr-reaction-bar'
    };

    var classes = {
        'voted':        'wyr-reaction-voted'
    };

    ctx.reactionsSelectors  = selectors;
    ctx.reactionsClasses    = classes;

    ctx.reactions = function () {
        var $body = $('body');

        // Catch event on wrapper to keep it working after box content reloading
        $body.on('click', selectors.link, function (e) {
            e.preventDefault();

            var $link       = $(this);
            var $wrapper    = $link.parents(selectors.wrapper);
            var nonce       = $.trim($link.attr('data-wyr-nonce'));
            var postId      = parseInt($link.attr('data-wyr-post-id'), 10);
            var authorId    = parseInt($link.attr('data-wyr-author-id'), 10);
            var type        = $.trim($link.attr('data-wyr-reaction'));

            if ($link.is(selectors.voted)) {
                return;
            }

            ctx.reactionVote({
                'postId':   postId,
                'authorId': authorId,
                'type':     type
            }, nonce, $wrapper);
        });

        // Update reactions for guests.
        if (!$body.is('.logged-in')) {
            $(selectors.link).each(function () {
                var $link  = $(this);
                var postId = parseInt($link.attr('data-wyr-post-id'), 10);
                var type   = $.trim($link.attr('data-wyr-reaction'));
                var reactionVoted = ctx.readCookie('wyr_vote_'+ type +'_' + postId);

                if (reactionVoted) {
                    $link.addClass(classes.voted);
                } else {
                    $link.removeClass(classes.voted);
                }
            });
        }
    };

    ctx.reactionVote = function (data, nonce, $box) {
        var config = $.parseJSON(window.wyr_front_config);

        if (!config) {
            ctx.log('Post voting failed. Global config is not defined!');
            return;
        }

        var xhr = $.ajax({
            'type': 'POST',
            'url': config.ajax_url,
            'dataType': 'json',
            'data': {
                'action':           'wyr_vote_post',
                'security':         nonce,
                'wyr_post_id':      data.postId,
                'wyr_author_id':    data.authorId,
                'wyr_vote_type':    data.type
            }
        });

        xhr.done(function (res) {
            if (res.status === 'success') {
                var reactions = res.args.state;

                ctx.reactionVoted(data.postId, data.type, $box);

                // Update reactions states.
                $box.find(selectors.link).each(function () {
                    var $this = $(this);

                    var type = $.trim($this.attr('data-wyr-reaction'));

                    if (typeof reactions[type] !== 'undefined') {
                        $this.find(selectors.value).text(reactions[type].count);
                        $this.find(selectors.bar).css('height', reactions[type].percentage + '%');
                    }
                });
            }
        });
    };

    ctx.reactionVoted = function(postId, type, $box) {
        var cookieName   = 'wyr_vote_'+ type +'_' + postId;

        ctx.createCookie(cookieName, true, 30);

        // Cookie can't be read immediately so we need to update CSS classes manually.
        $box.find('.wyr-reaction-' + type).addClass(classes.voted);
    };

    // fire
    $(document).ready(function () {
        ctx.reactions();
    });

})(jQuery, wyr);

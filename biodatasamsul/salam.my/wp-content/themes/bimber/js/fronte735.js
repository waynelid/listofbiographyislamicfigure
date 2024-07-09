/* global window */
/* global document */
/* global jQuery */
/* global g1 */
/* global bimber_front_config */
/* global SuperGif */
/* global Waypoint */
/* global enquire */
/* global mashsb */
/* global auto_load_next_post_params */


/*************
 *
 * Init env
 *
 *************/

(function($) {
    'use strict';

    var config = $.parseJSON(bimber_front_config);

    // namespace
    var g1 = {
        'config': config
    };

    g1.getWindowWidth = function () {
        if (typeof window.innerWidth !== 'undefined') {
            return window.innerWidth;
        }

        return $(window).width();
    };

    g1.isDesktopDevice = function () {
        return g1.getWindowWidth() > g1.getDesktopBreakpoint();
    };

    g1.getDesktopBreakpoint = function () {
        var desktopBreakPoint = $('#g1-breakpoint-desktop').css('min-width');

        if ( ! desktopBreakPoint ) {
            return 9999;
        }

        desktopBreakPoint = parseInt( desktopBreakPoint, 10 );

        // not set explicitly via css
        if (desktopBreakPoint === 0) {
            return 9999;
        }

        return desktopBreakPoint;
    };

    g1.isTouchDevice = function () {
        return ('ontouchstart' in window) || navigator.msMaxTouchPoints;
    };

    g1.isStickySupported = function () {
        var prefixes = ['', '-webkit-', '-moz-', '-ms-'];
        var block = document.createElement('div');
        var supported = false;
        var i;

        // Test for native support.
        for (i = prefixes.length - 1; i >= 0; i--) {
            try {
                block.style.position = prefixes[i] + 'sticky';
            }
            catch(e) {}
            if (block.style.position !== '') {
                supported = true;
            }
        }

        return supported;
    };

    g1.isRTL = function () {
        return $('body').is('.rtl');
    };

    // expose to the world
    window.g1 = g1;
})(jQuery);


/**************************
 *
 * document ready functions
 *
 *************************/

(function ($) {

    'use strict';

    $(document).ready(function () {
        g1.uiHelpers();

        if (g1.config.timeago === 'on') {
            g1.dateToTimeago();
        }

        g1.backToTop();
        g1.loadMoreButton();
        g1.infiniteScroll();
        g1.gifPlayer();
        g1.featuredEntries();
        g1.shareContentElements();
        g1.customShareButtons();
        g1.customizeShareButtons();
        g1.bpProfileNav();

        if (g1.config.sharebar === 'on') {
            g1.shareBar();
        }

        g1.stickyPosition();
        g1.droppableElements();
        g1.canvas();
        g1.canvasElements();
    });

    $(window).load(function () {
        g1.stickySidebar();
    });

})(jQuery);


/*************
 *
 * UI Helpers
 *
 ************/

(function ($) {

    'use strict';

    g1.uiHelpers = function () {
        if (g1.isTouchDevice()) {
            $('body').removeClass( 'g1-hoverable' );
        }

        // Add class to Mailchimp widget.
        $('.widget_mc4wp_form_widget').addClass( 'g1-box g1-newsletter').prepend('<i class="g1-box-icon"></i>');
    };

})(jQuery);


/****************
 *
 * Back to top
 *
 ****************/

(function ($) {

    'use strict';

    g1.backToTop = function () {
        var $scrollToTop = $('.g1-back-to-top');

        // init
        toggleVisibility($scrollToTop);

        $scrollToTop.on('click', function (e) {
            e.preventDefault();

            var multipier = 200;
            var durationRange = {
                min: 200,
                max: 1000
            };

            var winHeight = $(window).height();
            var docHeight = $(document).height();
            var proportion = Math.floor(docHeight / winHeight);

            var duration = proportion * multipier;

            if (duration < durationRange.min) {
                duration = durationRange.min;
            }

            if (duration > durationRange.max) {
                duration = durationRange.max;
            }

            $('html, body').animate({
                scrollTop: 0
            }, duration);
        });

        $(window).scroll(function() {
            window.requestAnimationFrame(function () {
                toggleVisibility($scrollToTop);
            });
        });
    };

    function toggleVisibility ($scrollToTop) {
        if ($(window).scrollTop() > 240) {
            $scrollToTop.addClass('g1-back-to-top-on').removeClass('g1-back-to-top-off');
        } else {
            $scrollToTop.addClass('g1-back-to-top-off').removeClass('g1-back-to-top-on');
        }
    }
})(jQuery);


/********************
 *
 * Load More Button
 *
 ********************/

(function ($) {

    'use strict';

    // prevent triggering the action more than once at the time
    var loading = false;

    g1.loadMoreButton = function () {
        $('.g1-load-more').on('click', function (e) {
            if (loading) {
                return;
            }

            loading = true;

            e.preventDefault();

            var $button = $(this);
            var $collectionMore = $button.parents('.g1-collection-more');
            var url = $button.attr('data-g1-next-page-url');

            $collectionMore.addClass('g1-collection-more-loading');

            // load page
            var xhr = $.get(url);

            // on success
            xhr.done(function (data) {
                var collectionSelector = '#primary > .g1-collection .g1-collection-items';

                // find elements in response
                var $resCollectionItems = $(data).find(collectionSelector).find('.g1-collection-item');
                var $resButton = $(data).find('.g1-load-more');

                // find collection on page
                var $collection = $(collectionSelector);

                // add extra classes to new loaded items
                $resCollectionItems.addClass('g1-collection-item-added');

                // add new elements to collection
                $collection.append($resCollectionItems);

                // load all dependent functions
                $('body').trigger( 'g1PageHeightChanged' );
                $('body').trigger( 'g1NewContentLoaded', [ $resCollectionItems ] );

                // update more button
                if ($resButton.length > 0) {
                    $button.attr('data-g1-next-page-url', $resButton.attr('data-g1-next-page-url'));
                } else {
                    $collectionMore.remove();
                }
            });

            xhr.fail(function () {
                $button.addClass('g1-info-error');
            });

            xhr.always(function () {
                $collectionMore.removeClass('g1-collection-more-loading');
                loading = false;
            });
        });
    };

})(jQuery);


/*******************
 *
 * Infinite scroll
 *
 ******************/

(function ($) {

    'use strict';

    g1.infiniteScrollConfig = {
        'offset': '150%'
    };

    var triggeredByClick = false;

    g1.infiniteScroll = function () {
        $('.g1-collection-more.infinite-scroll').each(function () {
            var $this = $(this);

            if ($this.is('.on-demand') && !triggeredByClick) {
                return false;
            }

            $this.waypoint(function(direction) {
                if('down' === direction) {
                    $this.find('.g1-load-more').trigger('click');
                }
            }, {
                // trigger when the "Load More" container is 10% under the browser window
                offset: g1.infiniteScrollConfig.offset
            });
        });
    };

    // wait for new content and apply infinite scroll events to it
    $('body').on( 'g1NewContentLoaded', function () {
        triggeredByClick = true;
        g1.infiniteScroll();
    } );

})(jQuery);


/*************
 *
 * GIF Player
 *
 *************/

(function ($) {

    'use strict';

    g1.gifPlayer = function ($scope) {
        if (! $scope ) {
            $scope = $('body');
        }

        // SuperGif library depends on the overrideMimeType method of the XMLHttpRequest object
        // if browser doesn't support this method, we can't use that library
        if ( typeof XMLHttpRequest.prototype.overrideMimeType === 'undefined' ) {
            return;
        }

        g1.gifPlayerIncludeSelectors =[
            '.entry-content img.aligncenter[src$=".gif"]',
            '.entry-content .aligncenter img[src$=".gif"]',
            'img.g1-enable-gif-player',
            '.entry-featured-media img[src$=".gif"]'
        ];

        g1.gifPlayerExcludeSelectors = [
            '.ajax-loader',             // for Contact Form 7
            '.g1-disable-gif-player'
        ];

        $( g1.gifPlayerIncludeSelectors.join(','), $scope ).not( g1.gifPlayerExcludeSelectors.join(',') ).each(function () {
            var $img = $(this);
            var imgClasses = $img.attr('class');
            var imgSrc = $img.attr('src');

            // Only locally stored gifs, unless user decided otherwise.
            if (imgSrc.indexOf(location.hostname) === -1 && !$img.is('.g1-enable-gif-player')) {
                return;
            }

            var gifObj = new SuperGif({
                gif: this,
                auto_play: 0
            });

            var $gitIndicator = $('<span class="g1-indicator-gif g1-loading">');

            gifObj.load(function() {
                var frames = gifObj.get_length();

                var $canvasWrapper = $(gifObj.get_canvas()).parent();

                // Animation?
                if (frames > 1) {
                    $canvasWrapper.on('hover', function() {
                        gifObj.play();
                        $gitIndicator.addClass('g1-indicator-gif-playing');
                    });

                    $gitIndicator.toggleClass('g1-loading g1-loaded');
                } else {
                    // It's just a gif type image, not animataion to play.
                    $gitIndicator.remove();
                }
            });

            // canvas parent can be fetched after gifObj.load() call
            var $canvasWrapper = $(gifObj.get_canvas()).parent();

            $canvasWrapper.
                addClass(imgClasses + ' g1-enable-share-links').
                attr('data-img-src', imgSrc).
                append($gitIndicator);
        });
    };

})(jQuery);


/*******************
 *
 * Featured Entries
 *
 ******************/

(function ($) {

    'use strict';

    var selectors = {
        'wrapper':  '.g1-featured',
        'items':    '.g1-featured-items',
        'item':     '.g1-featured-item',
        'prevLink': '.g1-featured-arrow-prev',
        'nextLink': '.g1-featured-arrow-next'
    };

    var classes = {
        'startPos': 'g1-featured-viewport-start',
        'endPos':   'g1-featured-viewport-end'
    };

    var isRTL;
    var $wrapper;   // main wrapper
    var $items;     // items wrapper, is scrollable
    var $prevLink;  // move collection left
    var $nextLink;  // move collection right

    // public
    g1.featuredEntries = function () {
        isRTL = g1.isRTL();

        $(selectors.wrapper).each(function () {
            $wrapper = $(this);
            $items = $wrapper.find(selectors.items);
            $prevLink = $wrapper.find(selectors.prevLink);
            $nextLink = $wrapper.find(selectors.nextLink);

            var singleItemWidth = $items.find(selectors.item + ':first').width();
            var moveOffset = 2 * singleItemWidth;
            var direction = isRTL ? -1 : 1;

            $prevLink.on('click', function (e) {
                e.preventDefault();

                scrollHorizontally(-direction * moveOffset);
            });

            $nextLink.on('click', function (e) {
                e.preventDefault();

                scrollHorizontally(direction * moveOffset);
            });

            $items.on('scroll', function () {
                window.requestAnimationFrame(function () {
                    updateScrollState();
                });
            });

            updateScrollState();
        });
    };

    // private
    function updateScrollState () {
        var width = $items.get(0).scrollWidth;
        var overflowedWidth = $items.width();
        var scrollLeft = $items.scrollLeft();

        $wrapper.removeClass(classes.endPos + ' ' + classes.startPos);

        // no scroll LTR, most left RTL
        if (scrollLeft <= 0) {
            if (isRTL) {
                $wrapper.addClass(classes.endPos);
                $wrapper.removeClass(classes.startPos);
            } else {
                $wrapper.addClass(classes.startPos);
                $wrapper.removeClass(classes.endPos);
            }
        // most right LTR, no scroll RTL
        } else if (width <= scrollLeft + overflowedWidth) {
            if (isRTL) {
                $wrapper.addClass(classes.startPos);
                $wrapper.removeClass(classes.endPos);
            } else {
                $wrapper.addClass(classes.endPos);
                $wrapper.removeClass(classes.startPos);
            }
        }
    }

    function scrollHorizontally(difference) {
        var leftOffset = $items.scrollLeft();

        $items.animate(
            // properties to animate
            {
                'scrollLeft': leftOffset + difference
            },
            375,        // duration
            'swing'     // easing
        );
    }

})(jQuery);


/*******************
 *
 * Date > Time ago
 *
 ******************/

(function ($) {

    'use strict';

    g1.dateConstans = {
        'day_ms':   1000 * 60 * 60 * 24,
        'month_ms': 1000 * 60 * 60 * 24 * 30,
        'year_ms':  1000 * 60 * 60 * 24 * 356
    };

    g1.dateToTimeago = function () {
        if (!$.fn.timeago) {
            return;
        }

        // override defaults
        $.timeago.settings.cutoff = g1.dateConstans.year_ms;

        $('time.entry-date, .comment-metadata time, time.snax-item-date').timeago();

        $('body').on( 'g1NewContentLoaded', function ( e, $newContent ) {
            if ($newContent) {
                $newContent.find('time.entry-date, .comment-metadata time, time.snax-item-date').timeago();
            }
        } );
    };

})(jQuery);


/**********
 *
 * Canvas
 *
 *********/

(function($) {
    'use strict';

    var selectors = {
        'toggle':   '.g1-hamburger'
    };

    g1.globalCanvasSelectors = selectors;

    var canvas;

    g1.canvas = function() {
        canvas = Canvas();

        // Allow global access.
        g1.canvasInstance = canvas;

        $(selectors.toggle).on('click', function (e) {
            e.preventDefault();

            canvas.open();
        });
    };

    function Canvas () {
        var that = {};
        var listeners = {
            'open': [],
            'close': []
        };

        var currentContent = '';

        var init = function () {
            var $overlay = $( '.g1-canvas-overlay');

            // toogle canvas events
            $overlay.on('click', that.toggle);

            $('.g1-canvas').on('toggle-canvas', function () {
                that.toggle();
            });

            $('.g1-canvas .g1-canvas-toggle').on('click', that.toggle);

            enquire.register('screen and ( min-width: 700px )', {
                match : function() {
                    that.close();
                }
            });

            return that;
        };

        that.getContent = function() {
            return $('.g1-canvas-global .g1-canvas-content');
        };

        that.open = function (content) {
            window.requestAnimationFrame(function () {
                $('html').
                addClass('g1-off-global').
                removeClass('mtm-off-from-global mtm-off-from-local');

                currentContent = content;
                var $canvas = $('.g1-canvas-global');

                if (content !== null) {
                    if (typeof content === 'string') {
                        $canvas.find('.g1-canvas-content').html(content);
                    } else {
                        $canvas.find('.g1-canvas-content').empty().append(content);
                    }

                    // notify about adding new content to DOM so other elements can be reloaded
                    $canvas.find('.g1-canvas-content').trigger('g1-new-content');
                }

                $canvas.scrollTop(0);

                that.notify('open');
            });
        };

        that.close = function () {
            window.requestAnimationFrame(function () {
                $('html').removeClass('g1-off-global');

                that.notify('close');
            });
        };

        that.toggle = function (e) {
            if (e) {
                e.preventDefault();
            }

            // is opened?
            if ( $('html').hasClass('g1-off-global') ) {
                that.close();
            } else {
                that.open(null);
            }
        };

        that.notify = function (eventType) {
            var callbacks = listeners[eventType];

            for (var i = 0; i < callbacks.length; i++) {
                callbacks[i](that.getContent());
            }
        };

        that.on = function (eventType, listener, priority) {
            listeners[eventType][priority] = listener;
        };

        return init();
    }

})(jQuery);



/********************
 *
 * Canvas elements
 *
 ********************/

(function($) {
    'use strict';

    var selectors = {
        'scope':                '.g1-navbar, .g1-header',
        'socialsWrapper':       '.g1-drop-the-socials',
        'socialsPlaceholder':   '.g1-drop-the-socials-placeholder',
        'searchWrapper':        '.g1-drop-the-search',
        'searchPlaceholder':    '.g1-drop-the-search-placeholder',
        'createWrapper':        '.snax-button-create',
        'createPlaceholder':    '.snax-button-create-placeholder',
        'quickNavWrapper':      '.g1-quick-nav',
        'quickNavPlaceholder':  '.g1-quick-nav-placeholder'
    };

    var classes = {
        'socialsPlaceholder':   'g1-drop-the-socials-placeholder',
        'searchPlaceholder':    'g1-drop-the-search-placeholder',
        'createPlaceholder':    'snax-button-create-placeholder',
        'quickNavPlaceholder':  'g1-quick-nav-placeholder'
    };

    var canvas;

    g1.canvasElementsSelectors  = selectors;
    g1.canvasElementsClasses    = classes;

    g1.canvasElements = function() {
        canvas = g1.canvasInstance;

        canvas.on('open', function($canvasContent) {
            g1.moveElementsToCanvas($canvasContent);
        }, 1);

        canvas.on('close', function($canvasContent) {
            g1.moveElementsFromCanvas($canvasContent);
        }, 1);
    };

    g1.moveElementsToCanvas = function ($canvasContent) {
        // Snax Create button.
        var $create  = $(selectors.createWrapper, selectors.scope);

        if ($create.length > 0 && !$create.is(':visible')) {
            var $createPlaceholder  = $('<span class="'+ classes.createPlaceholder +'">');

            $createPlaceholder.insertAfter($create);
            $canvasContent.prepend($create);
        }

        // Quick nav.
        var $quickNav = $(selectors.quickNavWrapper, selectors.scope);

        if ($quickNav.length > 0 && !$quickNav.is(':visible')) {
            var $quickNavPlaceholder  = $('<span class="'+ classes.quickNavPlaceholder +'">');

            $quickNavPlaceholder.insertAfter($quickNav);
            $canvasContent.append($quickNav);
        }

        // Search.
        var $search = $(selectors.searchWrapper, selectors.scope);

        if ($search.length > 0 && !$search.is(':visible')) {
            var $searchPlaceholder  = $('<span class="'+ classes.searchPlaceholder +'">');

            $searchPlaceholder.insertAfter($search);
            $canvasContent.append($search);
        }

        // Social icons.
        var $socials = $(selectors.socialsWrapper, selectors.scope);

        if ($socials.length > 0 && !$socials.is(':visible')) {
            var $socialsPlaceholder = $('<span class="'+ classes.socialsPlaceholder +'">');

            $socialsPlaceholder.insertAfter($socials);
            $canvasContent.append($socials);
        }
    };

    g1.moveElementsFromCanvas = function () {
        var $canvas = canvas.getContent();

        // Social icons.
        var $socialsPlaceholder = $(selectors.socialsPlaceholder);

        if ($socialsPlaceholder.length > 0) {
            $socialsPlaceholder.replaceWith($(selectors.socialsWrapper, $canvas));
        }

        // Search.
        var $searchPlaceholder  = $(selectors.searchPlaceholder);

        if ($searchPlaceholder.length > 0) {
            $searchPlaceholder.replaceWith($(selectors.searchWrapper, $canvas));
        }

        // Snax Create button.
        var $createPlaceholder  = $(selectors.createPlaceholder);

        if ($createPlaceholder.length > 0) {
            $createPlaceholder.replaceWith($(selectors.createWrapper, $canvas));
        }

        // Quick nav.
        var $quickNavPlaceholder  = $(selectors.quickNavPlaceholder);

        if ($quickNavPlaceholder.length > 0) {
            $quickNavPlaceholder.replaceWith($(selectors.quickNavWrapper, $canvas));
        }
    };

})(jQuery);


/********************
 *
 * Sticky sidebar
 *
 ********************/

(function($) {
    'use strict';

    var stickyContainerSelector = '.g1-row:first';

    g1.stickyTopOffsetSelectors = [
        '#wpadminbar',
        '.g1-sharebar'
    ];

    g1.stickySidebar = function() {
        enquire.register('screen and (min-width:'+ g1.getDesktopBreakpoint() +'px)', {
            match : function() {
                g1.activateStickySidebar();
            },
            unmatch: function () {
                g1.deactivateStickySidebar();
            }
        });

        $('body').on('g1PageHeightChanged', function () {
            g1.updateStickySidebar();
        });
    };

    g1.activateStickySidebar = function () {
        if (g1.isTouchDevice()) {
            return;
        }

        var containerColumnsSelector = '> .g1-row-inner > .g1-column';
        var stickySelector = '.g1-sticky-sidebar';
        var stickyHandlerNotExecuted = true;
        var containerHandlerBlocked = false;

        $(stickySelector).each(function () {
            var stickyEnabled = true;
            var $sticky = $(this);

            if ($sticky.hasClass('g1-activated')) {
                return;
            }

            var $container = $sticky.parents(stickyContainerSelector);
            var $containerColumns = $container.find(containerColumnsSelector);

            // sticky sidebar can't be in the highest column in the row
            // --------------------------------------------------------

            // first check if we can compare columns
            if ($containerColumns.length >= 2) {
                var $highestColumn = null;
                var highestColumnHeight = 0;

                // find the highest column
                $containerColumns.each(function () {
                    var $column = $(this);
                    var columnHeight = $column.outerHeight();

                    if (columnHeight > highestColumnHeight) {
                        highestColumnHeight = columnHeight;
                        $highestColumn = $column;
                    }
                });

                // if sticky inside the highest column prevent sticky
                if (null !== $highestColumn) {
                    if ($highestColumn.find($sticky).length > 0) {
                        stickyEnabled = false;
                    }
                }
            }

            var top = 0;
            top += parseInt($sticky.attr('data-g1-offset'), 10);

            for (var i = 0; i < g1.stickyTopOffsetSelectors.length; i++) {
                var $element = $(g1.stickyTopOffsetSelectors[i]);

                if ($element.length > 0 && $element.is(':visible')) {
                    top += parseInt($element.outerHeight(), 10);
                }
            }

            var containerHandler = function (direction) {
                if (direction === 'down') {
                    // offset between the container top edge and
                    // first sticky parent element that has the "relative" position set
                    var extraOffset = 0;

                    $sticky.parentsUntil($container).each(function () {
                        var $parent = $(this);

                        if ($parent.css('position') === 'relative') {
                            var parentOffset = $parent.offset();
                            var containerOffset = $container.offset();

                            if (typeof parentOffset.top !== 'undefined' && typeof containerOffset.top !== 'undefined') {
                                extraOffset = parseInt(parentOffset.top, 10) - parseInt(containerOffset.top, 10);
                            }

                            return false;
                        }
                    });

                    $sticky.css({
                        'position': 'absolute',
                        'top': $container.outerHeight() - $sticky.outerHeight(),
                        'width': $sticky.outerWidth()
                    });
                } else {
                    $sticky.css({
                        'position': 'fixed',
                        'top': top,
                        'width': $sticky.outerWidth()
                    });
                }
            };

            if (stickyEnabled) {
                var containerWaypoint = new Waypoint({
                    element: $container,
                    handler: function (direction) {
                        if (stickyHandlerNotExecuted) {
                            containerHandlerBlocked = true;
                            return;
                        }

                        containerHandler(direction);
                    },
                    offset: function() {
                        // Bottom edge of container - sticky height stick to the top edge of the viewport
                        return -$container.outerHeight() + $sticky.outerHeight() + top;
                    }
                });

                $container.data('waypoint', containerWaypoint);
            }

            if (stickyEnabled) {
                var waypoint = new Waypoint({
                    element: $sticky,
                    handler: function(direction) {
                        stickyHandlerNotExecuted = false;

                        if (direction === 'down') {
                            $sticky.css({
                                'position': 'fixed',
                                'top': top,
                                'width': $sticky.outerWidth()
                            });
                        } else {
                            $sticky.css({
                                'position': 'static',
                                'top': 0,
                                'width': 'auto'
                            });
                        }

                        if (containerHandlerBlocked) {
                            containerHandlerBlocked = false;

                            containerHandler('down');
                        }
                    },
                    offset: function () {
                        return top;
                    }
                });

                $sticky.data('waypoint', waypoint);
                $sticky.addClass('g1-activated');
            }
        });
    };

    g1.deactivateStickySidebar = function () {
        var $stickySidebar = $('.g1-sticky-sidebar.g1-activated');

        $stickySidebar.each(function () {
            var $sticky = $(this);
            var $container = $sticky.parents(stickyContainerSelector);

            var waypoint = $sticky.data('waypoint');
            var containerWaypoint = $container.data('waypoint');

            if (waypoint) {
                waypoint.destroy();
            }

            if (containerWaypoint) {
                containerWaypoint.destroy();
            }

            $sticky.removeClass('g1-activated');
            $sticky.removeAttr('style');
            $sticky.removeProp('style');
        });
    };

    g1.updateStickySidebar = function () {
        g1.deactivateStickySidebar();
        g1.activateStickySidebar();
    };

})(jQuery);


/**************************
 *
 * Share Content Elements
 * (images, video)
 *
 **************************/

(function ($) {
            
    'use strict';

    g1.shareContentElements = function ($scope) {
        if (! $scope) {
            $scope = $('#content');
        }

        var $mashButtons = $('.mashsb-buttons', $scope).first();

        // Check if Mashsharer Buttons are in use, at least one.
        if ($mashButtons.length === 0) {
            return;
        }

        g1.microShareIncludeSelectors =[
            '.entry-featured-media-main img.wp-post-image',
            '.entry-content img.aligncenter',
            '.entry-content .aligncenter img',
            '.entry-content .wp-video',
            '.entry-content .snax-item-box',
            '.entry-content .g1-enable-share-links'
        ];

        g1.microShareExcludeSelectors = [
            '.entry-content img.g1-disable-share-links'
        ];

        $( g1.microShareIncludeSelectors.join(',') ).not( g1.microShareExcludeSelectors.join(',') ).each(function () {
            var $elem = $(this);

            if ( $elem.parents('.mashsb-micro-wrapper').length > 0 ) {
                return;
            }

            // Get a copy of Mashsharer Buttons.
            // We need to change shares urls but we don't want to touch original buttons.
            var $microButtons = $mashButtons.clone(true);

            var $sharesWrapper = $('<div class="mashsb-micro">');
            $sharesWrapper.append($microButtons);

            // Hide subscribe button if it's opened via content box.
            if (typeof mashsb !== 'undefined' && mashsb.subscribe === 'content') {
                $microButtons.find('.mashicon-subscribe').hide();
            }

            // Add toggle link.
            var $microToggle = $('<div class="mashsb-micro-toggle"></div>');
            $sharesWrapper.prepend($microToggle);

            // Secondary shares wrapper contains small buttons, main wrapper containes large buttons.
            var $secondaryShares = $sharesWrapper.find('.secondary-shares');

            // We want all buttons to be small.
            $sharesWrapper.children('a').prependTo($secondaryShares);

            // Hide Toggle button, all buttons should be visible.
            $sharesWrapper.find('.onoffswitch').hide();

            // Hide view count.
            $sharesWrapper.find('.mashsb-count').hide();

            // Show small buttons and add them after content element.
            $secondaryShares.show();

            // @todo-pp: replace the "g1-img-wrap" class with something more general, we don't wrap just images here
            $elem.wrap( '<div class="g1-img-wrap"></div>' );

            $elem.parent().addClass( 'mashsb-micro-wrapper' );
            $elem.parent().append($sharesWrapper);

            $elem.find('.snax-item-share').empty();

            g1.getShareMeta($elem, function (title, url, thumb) {

                // Facebook.
                var $facebookLink = $microButtons.find('a.mashicon-facebook');

                if ($facebookLink.length > 0) {
                    g1.extendFacebookShareUrl($facebookLink, title, url);
                }

                // Twitter.
                var $twitterLink = $microButtons.find('a.mashicon-twitter');

                if ($twitterLink.length > 0) {
                    g1.extendTwitterShareUrl($twitterLink, title, url);
                }

                // Google+.
                var $googleLink = $microButtons.find('a.mashicon-google');

                if ($googleLink.length > 0) {
                    g1.extendGoogleShareUrl($googleLink, title, url);
                }

                // Pinterest.
                var $pinterestLink = $microButtons.find('a.mashicon-pinterest');

                if ($pinterestLink.length > 0) {
                    g1.extendPinterestShareUrl($pinterestLink, title, url, thumb);
                }

            });
        });

        // On none touchable devices, shares visibility is handled via css :hover.
        // On touch devices there is no "hover", so we emulate hover via CSS class toggle on click.
        $('.mashsb-micro-toggle').on('click', function () {
            $(this).parents('.mashsb-micro-wrapper').addClass('mashsb-micro-wrapper-expanded');
        });

        // Hide shares on focus out.
        $('body').on('click touchstart', function (e) {
            var $activeMicroShares = $(e.target).parents('.mashsb-micro-wrapper-expanded');

            // Collapse all expanded micro shares except active one.
            $('.mashsb-micro-wrapper-expanded').not($activeMicroShares).removeClass( 'mashsb-micro-wrapper-expanded' );
        });
    };

    g1.getShareMeta = function ($elem, callback) {
        var title   = '';
        var url     = '';
        var thumb   = '';

        var $shareMeta = $elem.find('.snax-item-share');

        if ($shareMeta) {
            title   = $shareMeta.attr('data-snax-share-title');
            url     = $shareMeta.attr('data-snax-share-url');
            thumb   = $shareMeta.attr('data-snax-share-thumb');

            callback(title, url, thumb);

        } else {
            // 1. from "src" attr (most images).
            var imgUrl = $elem.attr('src');

            // 2. from "data-img-src" attr (gifs replaced with SuperGif canvas).
            if (!imgUrl) {
                imgUrl = $elem.attr('data-img-src');
            }

            // 3. from style background-image (mejs video player, if poster set).
            if (!imgUrl) {
                // delay to wait until mejs player will be loaded
                $(window).load(function () {
                    var $poster = $elem.find('.mejs-poster');

                    if ($poster.length > 0) {
                        var posterImg = $poster.css('background-image');

                        if (posterImg) {
                            // remove url(" from the beginning, and ") from the end
                            posterImg = posterImg.substring(5, posterImg.length - 2);

                            callback(title, url, posterImg);
                        }
                    }
                });
            }

            if (imgUrl) {
                callback(title, url, imgUrl);
            }
        }
    };

    g1.getImageAbsoluteUrl = function (url) {
        if (!url) {
            return '';
        }

        if (url.indexOf('http') === 0) {
            return url;
        }

        return location.protocol + '//' + location.hostname + url;
    };

    g1.extendFacebookShareUrl = function ($link, title, url) {
        var shareUrl = $link.attr('href');

        if (url) {
            shareUrl = shareUrl.replace( /\?u=.*/, '?u='+ url);
        }

        if (title) {
            shareUrl +=  '&description=' + title;
        }

        $link.attr('href', shareUrl);
    };

    g1.extendTwitterShareUrl = function ($link, title, url) {
        var shareUrl = $link.attr('href');

        if (title) {
            shareUrl = shareUrl.replace( /\?text=.*&url/, '?text='+ title + '&url');
        }

        if (url) {
            shareUrl = shareUrl.replace( /&url=.*/, '&url='+ url);
        }

        $link.attr('href', shareUrl);
    };

    g1.extendGoogleShareUrl = function ($link, title, url) {
        var shareUrl = $link.attr('href');

        if (title) {
            shareUrl = shareUrl.replace( /\?text=.*&url/, '?text='+ title + '&url');
        }

        if (url) {
            shareUrl = shareUrl.replace( /&url=.*/, '&url='+ url);
        }

        $link.attr('href', shareUrl);
    };

    g1.extendPinterestShareUrl = function ($link, title, url, thumb) {
        var shareUrl = $link.attr('href');

        // Since Mashshare v3.2.8.
        if ('#' === shareUrl) {
            shareUrl = $link.attr('data-mashsb-url');
        }

        if (url) {
            shareUrl = shareUrl.replace( /&url=.*&media/, '&url='+ url + '&media');
        }

        if (thumb) {
            shareUrl = shareUrl.replace( /&media=.*&description/, '&media='+ g1.getImageAbsoluteUrl(thumb) + '&description');
        }

        if (title) {
            shareUrl = shareUrl.replace( /&description=.*/, '&description=' + title);
        }

        $link.attr('href', shareUrl);
    };

})(jQuery);


/*************************
 *
 * Custom Share Buttons
 * (open in a new window)
 *
 *************************/

(function ($) {

    'use strict';

    g1.customShareButtons = function () {
        openCustomSharesInNewWindow();
    };

    function openCustomSharesInNewWindow () {
        $('.mashicon-pinterest, .mashicon-google').click( function(e) {
            var winWidth = 750;
            var winHeight = 550;
            var winTop = (screen.height / 2) - (winHeight / 2);
            var winLeft = (screen.width / 2) - (winWidth / 2);
            var url = $(this).attr('href');

            // Since Mashshare v3.2.8.
            if ('#' === url) {
                url = $(this).attr('data-mashsb-url');
            }

            window.open(
                url,
                'sharer',
                'top=' + winTop + ',left=' + winLeft + ',toolbar=0,status=0,width=' + winWidth + ',height=' + winHeight
            );

            e.preventDefault();
        });
    }

})(jQuery);


/***************************
 *
 * Customize Share Buttons
 * (open in a new window)
 *
 ***************************/

(function ($) {

    'use strict';

    g1.customizeShareButtons = function () {
        overrideOnOffSwitch();
        subscribeViaMailbox();
    };

    function overrideOnOffSwitch () {
        // disable current events
        var $onoffswitch    = $('.onoffswitch');
        var $onoffswitch2   = $('.onoffswitch2');

        $onoffswitch.off('click');
        $onoffswitch2.off('click');

        $onoffswitch.on('click', function() {
            var $container = $(this).parents('.mashsb-container');

            $('.onoffswitch', $container).hide();
            $('.secondary-shares', $container).show();
            $('.onoffswitch2', $container).show();
        });

        $onoffswitch2.on('click', function() {
            var $container = $(this).parents('.mashsb-container');

            $('.onoffswitch', $container).show();
            $('.secondary-shares', $container).hide();
        });
    }

    function subscribeViaMailbox () {
        // Skip if subscription is done via content box.
        if (typeof mashsb !== 'undefined' && mashsb.subscribe === 'content') {
            return;
        }

        // Skip if subsciption is done via custom url.
        if (typeof mashsb !== 'undefined' && mashsb.subscribe_url !== '') {
            return;
        }

        // Open default mail client to subscribe.
        $('a.mashicon-subscribe').each(function () {
            var $link = $(this);

            if ($link.attr('href') === '#') {
                // remove all assigned events
                $link.off('click');

                var postTitle = $('head > title').text();
                var postUrl = location.href;

                var subject = g1.config.i18n.newsletter.subscribe_mail_subject_tpl.replace('%subject%', postTitle);
                var body = postTitle + '%0A%0A' + postUrl;

                // template
                var mailTo = 'mailto:?subject={subject}&body={body}';

                // build final link
                mailTo = mailTo.replace('{subject}', subject);
                mailTo = mailTo.replace('{body}', body);

                $link.attr('href', mailTo);
            }
        });
    }

})(jQuery);


/*************
 *
 * Share Bar
 *
 *************/

(function ($) {

    'use strict';

    g1.shareBarTopOffsetSelectors = [
        '#wpadminbar'
    ];

    g1.shareBar = function () {
        var $shareBar = g1.activateShareBar();

        $('body').on('g1PageHeightChanged', function () {
            if ($shareBar !== false) {
                g1.updateShareBarPosition($shareBar);
            }
        });
    };

    g1.activateShareBar = function () {
        var $shareBar = $('.g1-sharebar');
        var $shareButtons = $('.mashsb-container:first');

        // exit if any of required elements not exists
        if ($shareBar.length === 0 || $shareButtons.length === 0) {
            return false;
        }

        var $shareBarInner = $shareBar.find('.g1-sharebar-inner');

        if (!$shareBar.is('.g1-sharebar-loaded')) {
            var $clonedShareButtons = $shareButtons.clone(true);
            //$clonedShareButtons.removeClass('mashsb-main');

            // If shares are animated, we need to set total count in sharebar before animation ends
            if (typeof mashsb !== 'undefined' && mashsb.animate_shares === '1' && $clonedShareButtons.find('.mashsbcount').length) {
                $clonedShareButtons.find('.mashsbcount').text(mashsb.shares);
            }

            $shareBarInner.append($clonedShareButtons);

            $shareBar.addClass('g1-sharebar-loaded');

            g1.updateShareBarPosition($shareBar);
        }

        new Waypoint({
            element: $('body'),
            handler: function (direction) {
                if (direction === 'down') {
                    $shareBar.addClass('g1-sharebar-on');
                    $shareBar.removeClass('g1-sharebar-off');
                } else {
                    $shareBar.removeClass('g1-sharebar-on');
                    $shareBar.addClass('g1-sharebar-off');
                }
            },
            offset: function() {
                // trigger waypoint when body is scrolled down by 100px
                return -100;
            }
        });

        return $shareBar;
    };

    g1.updateShareBarPosition = function ($shareBar) {
        var top = 0;

        for (var i = 0; i < g1.shareBarTopOffsetSelectors.length; i++) {
            var $element = $(g1.shareBarTopOffsetSelectors[i]);

            if ($element.length > 0 && $element.is(':visible')) {
                top += parseInt($element.outerHeight(), 10);
            }
        }

        $shareBar.css('top', top + 'px');
    };

})(jQuery);


/*****************
 *
 * Sticky Elements
 *
 ****************/

(function ($) {

    'use strict';

    g1.stickyPosition = function () {
        var $stickyTop = $('.g1-sticky-top-wrapper');

        // If exists and not loaded already.
        if ($stickyTop.length > 0 && !$stickyTop.is('.g1-loaded')) {
            var disableStickyHeader = false;

            // Disable for smaller screens.
            if (g1.getWindowWidth() <= 800) {
                disableStickyHeader = true;
            }

            // Disable if sharebar enabled.
            var sharebarLoaded = $('.g1-sharebar-loaded').length > 0;

            if (sharebarLoaded) {
                disableStickyHeader = true;
            }

            if (disableStickyHeader) {
                // Prevent native sticky support, like on FF.
                $stickyTop.removeClass('g1-sticky-top-wrapper');
            } else {
                // Apply pollyfill only if not supported.
                if ($.fn.Stickyfill && !g1.isStickySupported()) {
                    $stickyTop.Stickyfill();
                }

                $stickyTop.addClass('g1-loaded');
            }
        }
    };

})(jQuery);


/**********************
 *
 * Droppable Elements
 *
 **********************/

(function ($) {

    'use strict';

    var selectors = {
        'drop' :        '.g1-drop',
        'dropExpanded': '.g1-drop-expanded',
        'dropToggle':   '.g1-drop-toggle'
    };

    var classes = {
        'dropExpanded': 'g1-drop-expanded'
    };

    g1.droppableElements = function () {
        // Hide drop on focus out.
        $('body').on('click touchstart', function (e) {
            var $activeDrop = $(e.target).parents('.g1-drop-expanded');

            // Collapse all except active.
            $(selectors.dropExpanded).not($activeDrop).removeClass(classes.dropExpanded);
        });

        // Handle drop state (expanded | collapsed).

        // For touch devices we need to toggle CSS class to trigger state change.
        if ( g1.isTouchDevice() ) {
            $(selectors.drop).on( 'click', function(e) {
                var $drop = $(this);

                // Drop is expanded, collapse it on toggle click.
                if ($drop.is(selectors.dropExpanded)) {
                    var $clickedElement = $(e.target);

                    var toggleClicked = $clickedElement.parents(selectors.dropToggle).length > 0;

                    if (toggleClicked) {
                        $drop.removeClass(classes.dropExpanded);
                        e.preventDefault();
                    }
                // Drop is collapsed, expand it.
                } else {
                    $drop.addClass(classes.dropExpanded);
                    e.preventDefault();
                }
            } );
        // Devices without touch events, state is handled via CSS :hover
        } else {
            // Prevent click on toggle.
            $(selectors.dropToggle).on( 'click', function(e) {
                e.preventDefault();
            });
        }
    };

})(jQuery);


/*************************
 *
 * BuddyPress Profile Nav
 *
 *************************/

(function ($, i18n) {

    'use strict';

    var selectors = {
        'items':        '> li:not(.g1-drop):not(.g1-delimiter):not(.current)'
    };

    var classes = {
        'hidden':       'hidden'
    };

    var isRTL = g1.isRTL();

    g1.bpProfileNav = function () {
        // Define reverse function as jQuery plugin.
        $.fn.g1Reverse = [].reverse;

        $('#object-nav.item-list-tabs > ul').each(function() {
            var $ul             = $(this);
            var $liMore         = $('<li class="g1-drop g1-drop-before">');
            var $liMoreToggle   = $('<a class="g1-drop-toggle" href="#">' + i18n.more_link + '<span class="g1-drop-toggle-arrow"></span></a>');
            var $liMoreContent  = $('<div class="g1-drop-content"></div>' );
            var $liMoreSubmenu  = $('<ul class="sub-menu"></ul>');
            var $liDelimiter    = $('<li class="g1-delimiter">');
            var maxWidth        = $ul.width() - $liMoreToggle.width();

            $liMore.
                append($liMoreToggle);
            $ul.
                append($liMore).
                append($liDelimiter);

            $ul.find(selectors.items).g1Reverse().each(function(index) {
                var $this = $(this);

                if ( isRTL) {
                    if ( $liMore.position().left < 0) {
                        $liMoreSubmenu.prepend( $this);
                    } else if (0 === index) {
                        $liMore.toggleClass(classes.hidden);
                        $liDelimiter.toggleClass(classes.hidden);

                        return false;
                    } else {
                        if ( $liDelimiter.position().left < 0 ) {
                            $liMoreSubmenu.prepend( $this);
                        }
                    }
                } else {
                    if ( $liMore.position().left > maxWidth) {
                        $liMoreSubmenu.prepend( $this);
                    } else if (0 === index) {
                        $liMore.toggleClass(classes.hidden);
                        $liDelimiter.toggleClass(classes.hidden);

                        return false;
                    } else {
                        if ( $liDelimiter.position().left > maxWidth ) {
                            $liMoreSubmenu.prepend( $this);
                        }
                    }
                }
            });

            $liMoreContent.append($liMoreSubmenu);
            $liMore.append($liMoreContent);
            $liDelimiter.toggleClass(classes.hidden);
        });
    };

})(jQuery, g1.config.i18n.bp_profile_nav);


/********************************
 *
 * BuddyPress input placeholders
 *
 ********************************/

(function ($) {

    'use strict';

    $( 'input#bp-login-widget-user-login' ).attr( 'placeholder', $( 'label[for="bp-login-widget-user-login"]' ).text() );
    $( 'input#bp-login-widget-user-pass' ).attr( 'placeholder', $( 'label[for="bp-login-widget-user-pass"]' ).text() );

})(jQuery);


/*******************************
 *
 * Auto Load Next Post plugin
 *
 *******************************/

(function ($) {

    'use strict';

    $(document).ready(function() {
        if ( typeof auto_load_next_post_params === 'object' ) {
            g1.autoLoadNextPost();
        }
    });

    g1.autoLoadNextPost = function() {
        // Use that code when plugin start supports the "alnpNewPostLoaded" event.
        // $('body').on('alnpNewPostLoaded', function () {
        //    updateElements();
        // });

        $('.post-divider').on('scrollSpy:exit', updateElements);
        $('.post-divider').on('scrollSpy:enter', updateElements);
    };

    function updateElements() {
        var $lastArticle = $('> article:last', auto_load_next_post_params.alnp_content_container );

        // Apply micro shares for new posts.
        g1.shareContentElements($lastArticle);

        // Reposition sitciky sidebar.
        g1.updateStickySidebar();

        // Load player.
        g1.gifPlayer($lastArticle);

        // Apply scrollspy again.
        $('.post-divider').on('scrollSpy:exit', updateElements);
        $('.post-divider').on('scrollSpy:enter', updateElements);
    }

})(jQuery);


// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
// MIT license

(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }
}());
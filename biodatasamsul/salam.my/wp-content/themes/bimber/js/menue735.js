/* global jQuery */
/* global g1 */
/* global console */

(function (context, $) {

    'use strict';

    $(document).ready(function () {
        var menu = Menu($('#g1-primary-nav'));
        handleMobileMenu(menu);
    });

    function Menu ($menu) {
        var that = {};

        that.init = function () {
            that.initVars();
            that.registerEventsHandlers();

            // add toggle to menu
            $('.menu-item-has-children > a').append( '<span class="g1-link-toggle"></span>' );

            return that;
        };

        that.initVars = function () {
            that.mode = 'regular';
            that.menuType = 'regular';
        };

        that.registerEventsHandlers = function () {
            that.handleMenuItemClick();
            that.handleMenuItemFocusOut();
        };

        that.handleMenuItemFocusOut = function () {
            $('body').on('click', function (e) {
                if ($(e.target).parents('.mtm-drop-expanded').length === 0 ) {
                    that.collapseAllOpenedSubmenus();
                }
            });
        };

        that.handleMenuItemClick = function () {
            that.getMenu().on('click', '.menu-item > a', function (e) {
                var isSimpleList = that.isMode('list');

                if (g1.isTouchDevice() || isSimpleList) {
                    that.handleMenuTouchEvent($(this), e);
                }
            });
        };

        that.handleMenuTouchEvent = function ($link, event) {
            var $li = $link.parent('li');

            if (that.isMode('regular')) {
                that.collapseAllOpenedSubmenus();
            } else {
                that.collapseAllOpenedSubmenus($li);
            }

            if ($li.hasClass('menu-item-has-children')) {
                event.preventDefault();


                var $helper = $li.find('ul.sub-menu:first > li.g1-menu-item-helper');

                if ($helper.length === 0) {
                    var href = $link.attr('href');
                    var anchor = 'Go to <span class="mtm-item-helper-title">'+ $link.text() +'</span>';

                    $helper = $('<li class="menu-item g1-menu-item-helper"><a class="mtm-link" href="'+ href +'"><span class="mtm-link-text"><span class="mtm-link-title">' + anchor +'</span></span></a></li>');

                    $li.find('ul.sub-menu:first').prepend($helper);
                }


                if (!$li.is('.mtm-drop-expanded')) {
                    $li.find('.mtm-drop-expanded .g1-menu-item-helper').remove();
                    $li.addClass('mtm-drop-expanded');
                } else {
                    $li.find('.mtm-drop-expanded').removeClass('mtm-drop-expanded');
                    $li.removeClass('mtm-drop-expanded');
                }
            }
        };

        that.collapseAllOpenedSubmenus = function ($currentItem) {
            if ($currentItem) {
                var $topLevelLi = $currentItem.parents('li.mtm-item-lvl-0');
                var $currentMenu = $currentItem.parents('nav.mtm');

                // collapse all opened submenus in current menu, beside current subtree
                $topLevelLi.siblings('li').find('.mtm-drop-expanded').removeClass('mtm-drop-expanded');

                // collapse all opened submenus in all other menus
                $('nav.mtm').not($currentMenu).find('.mtm-drop-expanded').removeClass('mtm-drop-expanded');
            } else {
                // collapse all opened, site wide, submenus
                $('.mtm-drop-expanded').removeClass('mtm-drop-expanded');
            }
        };

        that.switchToListMenu = function () {
            if (that.isMode('list')) {
                return that.log('list_mode_already_loaded');
            }

            that.setMode('list');
        };

        // regular menu
        that.switchToRegularMenu = function () {
            if ( that.isMode('regular')) {
                return that.log('regular_mode_already_loaded');
            }

            // remove "Go to" helper
            that.getMenu().find('.g1-menu-item-helper').remove();

            that.setMode('regular');
        };


        that.getMenu = function () {
            return $menu;
        };

        that.getMenuClass = function () {
            return that.getMenu().attr('class');
        };

        that.getWindowWidth = function () {
            if (typeof window.innerWidth !== 'undefined') {
                return window.innerWidth;
            }

            return $(window).width();
        };

        that.getWindowHeight = function () {
            if (typeof window.innerHeight !== 'undefined') {
                return window.innerHeight;
            }

            return $(window).height();
        };

        that.setMode = function (mode) {
            that.getMenu().
            removeClass('mtm-' + that.mode).
            addClass('mtm-' + mode);

            that.mode = mode;

            that.log('Menu mode "'+ mode +'" set.');
        };

        that.isMode = function (mode) {
            return that.mode === mode;
        };

        that.log = function (msg) {
            if (typeof console !== 'undefined') {
                console.log(msg);
            }
        };

        return that.init();
    }

    function handleMobileMenu(menu) {
        var canvas = g1.canvasInstance;

        canvas.on('open', function($canvasContent) {
            var $menu = menu.getMenu();

            var $placeholder = $('<span id="menu-placeholder-'+ $menu.attr('id') +'">');

            $menu.after($placeholder);
            $menu.detach();

            // Find search element.
            var $search = $canvasContent.find('.g1-drop-the-search');

            // Put menu after the serach.
            if ($search.length > 0) {
                $search.after($menu);
            } else {
                $canvasContent.prepend($menu);
            }

            menu.switchToListMenu();

        }, 0);

        canvas.on('close', function ($canvasContent) {
            var $menu = $canvasContent.find('#g1-primary-nav');

            var $placeholder = $('#menu-placeholder-' + $menu.attr('id'));

            if ($placeholder.length > 0) {
                $placeholder.replaceWith($menu);
                menu.switchToRegularMenu();
            }
        }, 0);
    }

})(window, jQuery);

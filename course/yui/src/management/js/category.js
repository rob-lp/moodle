/**
 * A managed category.
 *
 * @namespace M.course.management
 * @class Category
 * @constructor
 * @extends Item
 */
function Category() {
    Category.superclass.constructor.apply(this, arguments);
}
Category.NAME = 'moodle-course-management-category';
Category.CSS_PREFIX = 'management-category';
Category.ATTRS = {
    /**
     * The category ID relating to this category.
     * @attribute categoryid
     * @type Number
     * @writeOnce
     * @default null
     */
    categoryid : {
        getter : function (value, name) {
            if (value === null) {
                value = this.get('node').getData('id');
                this.set(name, value);
            }
            return value;
        },
        value : null,
        writeOnce : true
    },

    /**
     * True if this category is the currently selected category.
     * @attribute selected
     * @type Boolean
     * @default null
     */
    selected : {
        getter : function(value, name) {
            if (value === null) {
                value = this.get('node').getData(name);
                if (value === null) {
                    value = false;
                }
                this.set(name, value);
            }
            return value;
        },
        value : null
    },

    /**
     * An array of courses belonging to this category.
     * @attribute courses
     * @type Course[]
     * @default Array
     */
    courses : {
        validator : function(val) {
            return Y.Lang.isArray(val);
        },
        value : []
    }
};
Category.prototype = {
    /**
     * Initialises an instance of a Category.
     * @method initializer
     */
    initializer : function() {
        this.set('itemname', 'category');
    },

    /**
     * Returns the name of the category.
     * @method getName
     * @returns {String}
     */
    getName : function() {
        return this.get('node').one('a.categoryname').get('innerHTML');
    },

    /**
     * Registers a course as belonging to this category.
     * @method registerCourse
     * @param {Course} course
     */
    registerCourse : function(course) {
        var courses = this.get('courses');
        courses.push(course);
        this.set('courses', courses);
    },

    /**
     * Handles a category related event.
     *
     * @method handle
     * @param {String} action
     * @param {EventFacade} e
     * @returns {Boolean}
     */
    handle : function(action, e) {
        var catarg = {categoryid : this.get('categoryid')};
        switch (action) {
            case 'moveup':
                e.preventDefault();
                this.get('console').performAjaxAction('movecategoryup', catarg, this.moveup, this);
                break;
            case 'movedown':
                e.preventDefault();
                this.get('console').performAjaxAction('movecategorydown', catarg, this.movedown, this);
                break;
            case 'show':
                e.preventDefault();
                this.get('console').performAjaxAction('showcategory', catarg, this.show, this);
                break;
            case 'hide':
                e.preventDefault();
                this.get('console').performAjaxAction('hidecategory', catarg, this.hide, this);
                break;
            case 'expand':
                e.preventDefault();
                if (this.get('node').getData('expanded') === '0') {
                    this.get('node').setAttribute('data-expanded', '1').setData('expanded', 'true');
                    this.get('console').performAjaxAction('getsubcategorieshtml', catarg, this.loadSubcategories, this);
                }
                this.expand();
                break;
            case 'collapse':
                e.preventDefault();
                this.collapse();
                break;
            default:
                Y.log('Invalid AJAX action requested of managed category.', 'warn', 'moodle-course-management');
                return false;
        }
    },

    /**
     * Expands the category making its sub categories visible.
     * @method expand
     */
    expand : function() {
        var node = this.get('node'),
            action = node.one('a[data-action=expand]');
        node.removeClass('collapsed').setAttribute('aria-expanded', 'true');
        action.setAttribute('data-action', 'collapse').one('img').setAttrs({
            src : M.util.image_url('t/switch_minus', 'moodle'),
            title : M.util.get_string('collapse', 'moodle'),
            alt : M.util.get_string('collapse', 'moodle')
        });
    },

    /**
     * Collapses the category making its sub categories hidden.
     * @method collapse
     */
    collapse : function() {
        var node = this.get('node'),
            action = node.one('a[data-action=collapse]');
        node.addClass('collapsed').setAttribute('aria-expanded', 'false');
        action.setAttribute('data-action', 'expand').one('img').setAttrs({
            src : M.util.image_url('t/switch_plus', 'moodle'),
            title : M.util.get_string('expand', 'moodle'),
            alt : M.util.get_string('expand', 'moodle')
        });
    },

    /**
     * Loads sub categories provided by an AJAX request..
     *
     * @method loadSubcategories
     * @protected
     * @param {Number} transactionid The transaction ID of the AJAX request (unique)
     * @param {Object} response The response from the AJAX request.
     * @param {Object} args The arguments given to the request.
     * @return {Boolean} Returns true on success - false otherwise.
     */
    loadSubcategories : function(transactionid, response, args) {
        var outcome = this.checkAjaxResponse(transactionid, response, args),
            node = this.get('node'),
            console = this.get('console');
        if (outcome === false) {
            Y.log('AJAX failed to load sub categories for '+this.get('itemname'), 'warn', 'moodle-course-management');
            return false;
        }
        Y.log('AJAX loaded subcategories for '+this.get('itemname'), 'info', 'moodle-course-management');
        node.append(outcome.html);
        console.initialiseCategories(node);
        if (M.core && M.core.actionmenu && M.core.actionmenu.newDOMNode) {
            M.core.actionmenu.newDOMNode(node);
        }
        return true;
    },

    /**
     * Moves the course to this category.
     *
     * @method moveCourseTo
     * @param {Course} course
     */
    moveCourseTo : function(course) {
        var self = this;
        Y.use('moodle-core-notification-confirm', function() {
            var confirm = new M.core.confirm({
                title : M.util.get_string('confirm', 'moodle'),
                question : M.util.get_string('confirmcoursemove', 'moodle', {
                    course : course.getName(),
                    category : self.getName()
                }),
                yesLabel : M.util.get_string('yes', 'moodle'),
                noLabel : M.util.get_string('no', 'moodle')
            });
            confirm.on('complete-yes', function() {
                confirm.hide();
                confirm.destroy();
                this.get('console').performAjaxAction('movecourseintocategory', {
                    categoryid : this.get('categoryid'),
                    courseid : course.get('courseid')
                }, this.completeMoveCourse, this);
            }, self);
            confirm.show();
        });
    },

    /**
     * Completes moving a course to this category.
     * @method completeMoveCourse
     * @protected
     * @param {Number} transactionid The transaction ID of the AJAX request (unique)
     * @param {Object} response The response from the AJAX request.
     * @param {Object} args The arguments given to the request.
     * @returns {Boolean}
     */
    completeMoveCourse : function(transactionid, response, args) {
        var outcome = this.checkAjaxResponse(transactionid, response, args),
            course;
        if (outcome === false) {
            Y.log('AJAX failed to move courses into this category: '+this.get('itemname'), 'warn', 'moodle-course-management');
            return false;
        }
        course = this.get('console').getCourseById(args.courseid);
        if (!course) {
            Y.log('Course was moved but the course listing could not be found to reflect this', 'warn', 'moodle-course-management');
            return false;
        }
        Y.log('Moved the course ('+course.getName()+') into this category ('+this.getName()+')', 'info', 'moodle-course-management');
        this.highlight();
        if (course) {
            course.remove();
        }
        return true;
    },

    /**
     * Makes an item visible.
     *
     * @method show
     * @param {Number} transactionid The transaction ID of the AJAX request (unique)
     * @param {Object} response The response from the AJAX request.
     * @param {Object} args The arguments given to the request.
     * @returns {Boolean}
     */
    show : function(transactionid, response, args) {
        var outcome = this.checkAjaxResponse(transactionid, response, args);
        if (outcome === false) {
            Y.log('AJAX request to show '+this.get('itemname')+' by outcome.', 'warn', 'moodle-course-management');
            return false;
        }

        this.markVisible();
        if (outcome.categoryvisibility) {
            this.updateChildVisibility(outcome.categoryvisibility);
        }
        if (outcome.coursevisibility) {
            this.updateCourseVisiblity(outcome.coursevisibility);
        }
        this.updated();
        Y.log('Success: category made visible by AJAX.', 'info', 'moodle-course-management');
    },

    /**
     * Hides an item.
     *
     * @method hide
     * @param {Number} transactionid The transaction ID of the AJAX request (unique)
     * @param {Object} response The response from the AJAX request.
     * @param {Object} args The arguments given to the request.
     * @returns {Boolean}
     */
    hide : function(transactionid, response, args) {
        var outcome = this.checkAjaxResponse(transactionid, response, args);
        if (outcome === false) {
            Y.log('AJAX request to hide '+this.get('itemname')+' by outcome.', 'warn', 'moodle-course-management');
            return false;
        }
        this.markHidden();
        if (outcome.categoryvisibility) {
            this.updateChildVisibility(outcome.categoryvisibility);
        }
        if (outcome.coursevisibility) {
            this.updateCourseVisiblity(outcome.coursevisibility);
        }
        this.updated();
        Y.log('Success: '+this.get('itemname')+' made hidden by AJAX.', 'info', 'moodle-course-management');
    },

    /**
     * Updates the visibility of child courses if required.
     * @method updateCourseVisiblity
     * @chainable
     * @param courses
     */
    updateCourseVisiblity : function(courses) {
        var console = this.get('console'),
            key,
            course;
        Y.log('Changing categories course visibility', 'info', 'moodle-course-management');
        try {
            for (key in courses) {
                if (typeof courses[key] === 'object') {
                    course = console.getCourseById(courses[key].id);
                    if (course) {
                        if (courses[key].show === "1") {
                            course.markVisible();
                        } else {
                            course.markHidden();
                        }
                    }
                }
            }
        } catch (err) {
            Y.log('Error trying to update course visibility: ' + err.message, 'warn', 'moodle-course-management');
        }
        return this;
    },

    /**
     * Updates the visibility of subcategories if required.
     * @method updateChildVisibility
     * @chainable
     * @param categories
     */
    updateChildVisibility : function(categories) {
        var console = this.get('console'),
            key,
            category;
        Y.log('Changing categories subcategory visibility', 'info', 'moodle-course-management');
        try {
            for (key in categories) {
                if (typeof categories[key] === 'object') {
                    category = console.getCategoryById(categories[key].id);
                    if (category) {
                        if (categories[key].show === "1") {
                            category.markVisible();
                        } else {
                            category.markHidden();
                        }
                    }
                }
            }
        } catch (err) {
            Y.log('Error trying to update category visibility: ' + err.message, 'warn', 'moodle-course-management');
        }
        return this;
    }
};
Y.extend(Category, Item, Category.prototype);
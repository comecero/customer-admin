var gulp = require("gulp");
var watch = require("gulp-watch");
var batch = require('gulp-batch');
var concat = require("gulp-concat");
var uglify = require("gulp-uglify");
var rename = require("gulp-rename");
var less = require("gulp-less");
var sequence = require("run-sequence");

// It is important that you include app.js first, utilities.js second and run.js third. After that, the order is not important.
gulp.task("concat-angular-app", function () {
    return gulp.src(["./app/app.js", "./src/js/internal/utilities.js", "./app/run.js", "./src/js/internal/base.js", "./app/shared/*.js", "./src/js/libraries/*.js"])
      .pipe(concat("app.js"))
      .pipe(gulp.dest("./dist/js/"));
});

// utilities.js is used on its own in /pages/notifications/preview, so we copy a stand-alone version to dist that will get compressed.
gulp.task("concat-angular-utils", function () {
    return gulp.src(["./src/js/internal/utilities.js"])
      .pipe(gulp.dest("./dist/js/"));
});

// Concat JavaScript files in pages
gulp.task("concat-angular-pages", function () {
    return gulp.src(["./app/pages/**/*.js"])
      .pipe(concat("pages.js"))
      .pipe(gulp.dest("./dist/js/"));
});

gulp.task("concat-css-libraries", function () {
    return gulp.src(["./src/css/libraries/*.css"])
      .pipe(concat("libraries.css"))
      .pipe(gulp.dest("./dist/css/"));
});

gulp.task('less-base', function () {
    return gulp.src('./src/css/less/base/base.less')
      .pipe(less({
          paths: [__dirname]
      }))
      .pipe(gulp.dest('./dist/css'));
});

gulp.task("compress", function () {
    return gulp.src(["./dist/js/*.js", "!./dist/js/*.min.js"])
    .pipe(uglify())
     .pipe(rename({
        extname: ".min.js"
    }))
    .pipe(gulp.dest("./dist/js/"));
});

gulp.task('dist', function (done) {
    sequence('concat-angular-app', 'concat-angular-utils', 'concat-angular-pages', 'less-base', 'concat-css-libraries', 'compress', function () {
        done();
    });
});

gulp.task('watch', function () {
    watch('./app/**/*.js', batch(function (events, done) {
        gulp.start('dist', done);
    }));
});
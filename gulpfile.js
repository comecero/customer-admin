var gulp = require("gulp");
var watch = require("gulp-watch");
var batch = require('gulp-batch');
var concat = require("gulp-concat");
var uglify = require("gulp-uglify");
var rename = require("gulp-rename");
var less = require("gulp-less");
var sequence = require("run-sequence");
var fs = require("fs");

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
    return gulp.src('./less/style.less')
      .pipe(less({
          paths: [__dirname]
      }))
      .pipe(gulp.dest('./less/'));
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

gulp.task('copy-settings', function (done) {

    // Copy the settings files from the samples to valid files for testing. If you provide an account_id, it will update the files with the supplied account_id. You can also provide an api host if you are targeting a non-production API environment.
    // gulp copy-settings --account_id AA1111 --api_host api-dev.comecero.com

    // Get the account_id, if supplied.
    var account_id = "AA0000", i = process.argv.indexOf("--account_id");
    if (i > -1) {
        account_id = process.argv[i + 1];
    }

    var api_host = "api.comecero.com", x = process.argv.indexOf("--api_host");
    if (x > -1) {
        api_host = process.argv[x + 1];
    }

    fs.readFile("./settings/account-SAMPLE.js", "utf-8", function (err, data) {

        // Remove the comments from the top of the file
        data = removeHeaderLines(data, 2);

        data = data.replace("AA0000", account_id);
        data = data.replace("api.comecero.com", api_host);
        fs.writeFile("./settings/account.js", data, 'utf8', function (err) {
            if (err) {
                return console.log(err);
            }
        });
    });

    fs.readFile("./settings/app-SAMPLE.js", "utf-8", function (err, data) {

        // Remove the comments from the top of the file
        data = removeHeaderLines(data, 2);

        data = data.replace("AA0000", account_id);
        data = data.replace("api.comecero.com", api_host);
        fs.writeFile("./settings/app.js", data, 'utf8', function (err) {
            if (err) {
                return console.log(err);
            }
        });
    });

    fs.readFile("./settings/style-SAMPLE.js", "utf-8", function (err, data) {

        // Remove the comments from the top of the file
        data = removeHeaderLines(data, 3);

        data = data.replace("AA0000", account_id);
        data = data.replace("api.comecero.com", api_host);
        fs.writeFile("./settings/style.js", data, 'utf8', function (err) {
            if (err) {
                return console.log(err);
            }
        });
    });

});

function removeHeaderLines(text, numberOfLines) {
    if (text) {
        var lines = text.split('\n');
        lines.splice(0, numberOfLines);
        return lines.join('\n');
    }
}
'use strict';

var gulp = require('gulp');
var plumber = require('gulp-plumber');
var del = require('del');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var server = require('browser-sync');
var runSequence = require('run-sequence');
var path = require('path');
var gulpIf = require('gulp-if');
var sourcemaps = require('gulp-sourcemaps');

var sass = require('gulp-sass');
var postcss = require('gulp-postcss');
var assets = require('postcss-assets');
var mqpacker = require('css-mqpacker');
var flexboxfixer = require('postcss-flexboxfixer');
var autoprefixer = require('autoprefixer');
var cssnano = require('cssnano');
var reporter = require('postcss-reporter');
var syntax_scss = require('postcss-scss');
var stylelint = require('stylelint');

var uglify = require('gulp-uglify');
var svg_sprite = require('gulp-svg-sprite');
var imagemin = require('gulp-imagemin');

var argv = require('minimist')(process.argv.slice(2));
var isOnProduction = !!argv.production;
var buildPath = isOnProduction ? 'build' : 'tmp';
var srcPath = 'src';
var ghPages = require('gulp-gh-pages');

//************** JS **********************************************************************
gulp.task('js', function() {
    gulp.src(['lib/**', 'modules/**', 'app.js'], {cwd: path.join(srcPath, 'js')})
        .pipe(plumber())
        .pipe(concat('script.js'))
        .pipe(gulp.dest(path.join(buildPath, 'js')))
        .pipe(uglify())
        .pipe(rename('script.min.js'))
        .pipe(gulp.dest(path.join(buildPath, 'js')))
});

//************** IMG **********************************************************************
gulp.task('img', function() {
    gulp.src(['!svg-sprite', '!svg-sprite/**', '!inline', '!inline/**', '**/*.{jpg,png,svg}'], {cwd: path.join(srcPath, 'img')})
        .pipe(imagemin({
            progressive: true}))
        .pipe(gulp.dest(path.join(buildPath, 'img')))
});

//************** SVG **********************************************************************
gulp.task('svg', function() {
    return gulp.src('svg-sprite/*.svg', {cwd: path.join(srcPath, 'img')})
        .pipe(svg_sprite({
            mode: {
                symbol: {
                    dest: '.',
                    dimensions: '%s',
                    sprite: path.join(buildPath, 'img/svg-sprite.svg'),
                    example: false,
                    render: {
                        scss: {
                            dest: path.join(srcPath, 'scss/_global/svg-sprite.scss'),
                        }
                    }
                }
            },
            svg: {
                xmlDeclaration: false,
                doctypeDeclaration: false
            }
        }))
        .pipe(gulp.dest('./'))
});

//************** FONTS **********************************************************************
gulp.task('font', function() {
    gulp.src('**/*{woff,woff2}', {cwd: path.join(srcPath, 'fonts')})
        .pipe(gulp.dest(path.join(buildPath, 'fonts')))
});

//************** HTML **********************************************************************
gulp.task('html', function(){
    gulp.src('*.html', {cwd: srcPath})
        .pipe(gulp.dest(buildPath))
});

//************** STYLE LINT **********************************************************************
gulp.task('styletest', function() {
    var processors = [
      stylelint(),
      reporter({ clearMessages: true })
    ];

    return gulp.src(['!_global/svg-sprite.scss', '**/*.scss'], {cwd: path.join(srcPath, 'scss')})
        .pipe(plumber())
        .pipe(postcss(processors, {
            syntax: syntax_scss
        }))
});

//************** STYLE **********************************************************************
gulp.task('style', ['styletest'], function() {
    gulp.src('style.scss', {cwd: path.join(srcPath, 'scss')})
        .pipe(plumber())
        .pipe(gulpIf(!isOnProduction, sourcemaps.init()))
        .pipe(sass())
        .pipe(postcss([
            mqpacker,
            flexboxfixer,
            autoprefixer({
                browsers: [
                    'last 2 version',
                    'last 2 Chrome versions',
                    'last 2 Firefox versions',
                    'last 2 Opera versions',
                    'last 2 Edge versions'
                ]
            }),
            assets({
                loadPaths: [path.join(srcPath, 'img')]
            }),
            cssnano({
                safe:true
            })
        ]))
        .pipe(rename('style.min.css'))
        .pipe(gulpIf(!isOnProduction, sourcemaps.write()))
        .pipe(gulp.dest(path.join(buildPath, 'css')))

});

//************** DELETE **********************************************************************
gulp.task('del', function() {
    return del([path.join(buildPath), path.join(srcPath, 'scss/_global/svg-sprite.scss')]).then(paths => {
        console.log('Deleted files and folders:\n', paths.join('\n'));
    });
});

// *********** SERVE ************************************************************************
gulp.task('serve', function() {
    server.init({
        server: {
            baseDir: buildPath
        },
        notify: true,
        open: true,
        ui: false
    });
});

//************** BUILD **********************************************************************
gulp.task('build', ['del'], function (callback) {
    runSequence(
        'svg',
        'img',
        ['js', 'font'],
        'style',
        'html',
        callback);
});

//************** DEPLOY **********************************************************************
gulp.task('deploy', function() {
    return gulp.src('**/*.*', {cwd: path.join(buildPath)})
        .pipe(ghPages());
});

//************** DEFAULT **********************************************************************
var allTasks = ['build'];
if (!isOnProduction) {
    allTasks.push('serve');
}

gulp.task('default', allTasks, function() {
    if (!isOnProduction) {
        gulp.watch('**/*.js', {cwd: path.join(srcPath, 'js')}, ['js', server.reload]);
        gulp.watch('svg-sprite/*.svg', {cwd: path.join(srcPath, 'img')}, ['svg', server.reload]);
        gulp.watch(['!svg-sprite', '!svg-sprite/**', '!inline', '!inline/**', '**/*.{jpg,png,svg}'], {cwd: path.join(srcPath, 'img')}, ['img', server.reload]);
        gulp.watch('**/*{woff,woff2}', {cwd: path.join(srcPath, 'fonts')}, ['font', server.reload]);
        gulp.watch('**/*.scss', {cwd: path.join(srcPath, 'scss')}, ['style', server.stream]);
        gulp.watch('*.html', {cwd: srcPath}, ['html', server.reload]);
    }
});

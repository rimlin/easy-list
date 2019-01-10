/*global require*/
'use strict';

const gulp = require('gulp');
const prefix = require('gulp-autoprefixer');
const sass = require('gulp-sass');
const browserSync = require('browser-sync');
const cssimport = require('gulp-cssimport');
const cleanCSS = require('gulp-clean-css');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const tsify = require('tsify');
const watchify = require('watchify');
const gutil = require('gulp-util');
const es = require('event-stream');

const paths = {
  dest: './example-dist/',
  inputHtml: ['./example/**/*.html'],
  inputScss: ['./example/**/*.scss'],
  inputTypescript: ['./example/**/*.ts'],
  inputImages: ['./example/**/*.{png,jpg}'],
};

function bundle (browserify, dest) {
  return browserify
    .bundle()
    .on('error', console.error)
    .pipe(source('index.js'))
    .pipe(gulp.dest(dest))
    .pipe(browserSync.reload({
		  stream: true
	  }));
}

const files = [
  './example/block_scroll/index.ts',
  './example/window_scroll/index.ts',
  './example/window_scroll_shadow/index.ts',
];

var tsBuildTasks = files.map(function(entry) {
  const bundleBrowserify = browserify({
    basedir: '.',
    debug: true,
    entries: [entry],
    cache: {},
    packageCache: {}
  })
  .plugin(tsify)
  .transform('babelify');

  const watchedBrowserify = watchify(bundleBrowserify);
  const destPath = `${paths.dest}${entry.split('/')[2]}/`;

  watchedBrowserify.on('update', bundle.bind(bundle, bundleBrowserify, destPath));
  watchedBrowserify.on('log', gutil.log);

  return bundle(bundleBrowserify, destPath);
});

const tsBuildTasksStream = es.merge.apply(null, tsBuildTasks);

gulp.task('html', function () {
  return gulp.src(paths.inputHtml)
    .pipe(gulp.dest(paths.dest));
});

gulp.task('sass', function () {
	return gulp.src(paths.inputScss)
	  .pipe(sass({
      includePaths: paths.inputScss.concat(['./node_modules',]),
    }))
	  .on('error', sass.logError)
    .pipe(cssimport({
      includePaths: paths.inputScss.concat(['./node_modules',]),
    }))
	  .pipe(prefix(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], {
		  cascade: true
    }))
    .pipe(cleanCSS())
	  .pipe(gulp.dest(paths.dest))
	  .pipe(browserSync.reload({
		  stream: true
	  }));
  });

gulp.task('images', function () {
  return gulp.src(paths.inputImages)
    .pipe(gulp.dest(paths.dest))
    .pipe(browserSync.reload({
      stream: true
    }));
  });

const tasks = ['html', 'sass', 'images'];

gulp.task('rebuild', tasks, function () {
  browserSync.reload();
});

gulp.task('browser-sync', tasks, function () {
  browserSync({
    server: {
      baseDir: paths.dest
    },
    serveStatic: [{
      route: '/',
      dir: paths.dest
    }],
    notify: false
  });
});

gulp.task('watch', function () {
  gulp.watch(paths.inputHtml, ['rebuild']);
  gulp.watch(paths.inputScss, ['rebuild']);
  //gulp.watch(paths.inputTypescript, ['rebuild']);
  gulp.watch(paths.inputImages, ['rebuild']);
});

gulp.task('build', tasks);

gulp.task('default', ['browser-sync', 'watch'], () => tsBuildTasksStream);

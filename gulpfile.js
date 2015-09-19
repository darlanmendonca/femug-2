'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
var util = require('util');
var spawn = require('child_process').spawn;
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var argv = require('yargs').argv;
var plumber = require('gulp-plumber');
var browserSync = require('browser-sync').create();
var jade = require('gulp-jade');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var autoprefixer = require('gulp-autoprefixer');
var spritesmith = require('gulp.spritesmith');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var inject = require('gulp-inject');


var files = {
  views: {
    src: './assets/views/*.jade',
    dest: './public/'
  },
  styles: {
    src: './assets/styles/*.scss',
    dest: './public/styles/'
  },
  scripts: {
    src: './assets/none/**/*.js',
    dest: './public/scripts/'
  },
  sprites: {
    src: './assets/sprites/*.png',
    dest: './public/imgs/sprites/'
  }
};

var lintScripts = [
  './gulpfile.js',
];


var onError = function (err) {
  var message;
  switch (err.plugin) {
    case 'gulp-sass':
      var messageFormatted = err.messageFormatted;
      message = new gutil.PluginError('gulp-sass', messageFormatted).toString();
      process.stderr.write(message + '\n');
      break;
    case 'gulp-jade':
      message = new gutil.PluginError('gulp-jade', err.message).toString();
      process.stderr.write(message + '\n');
      break;
    default:
      message = new gutil.PluginError(err.plugin, err.message).toString();
      process.stderr.write(message + '\n');

  }
  gutil.beep();
};




gulp.task('browser-sync', function() {
  browserSync.init({
    server: {
      baseDir: './public'
    },
    notify: false,
    reloadDelay: 100,
    open: argv.open
  });
});

gulp.task('sprites', function() {
  var options = {
    imgName: 'sprites.png',
    cssName: 'sprite-vars.scss',
    imgPath: '../imgs/sprites/sprites.png',
    algorithm: 'binary-tree',
    engine: 'pngsmith',
    cssVarMap: function (sprite) {
      sprite.name = 'sprite-'+sprite.name;
    }
  };
  var sprite = gulp.src(files.sprites.src)
    .pipe(plumber())
    .pipe(spritesmith(options));

  sprite.img.pipe(gulp.dest(files.sprites.dest));
  sprite.css.pipe(gulp.dest('./assets/styles/components/'));
});

gulp.task('styles', function() {
  var bower = require('bower-files')();
  var dependencies = bower.relative(__dirname).ext('scss').files;
  var injectTransform = {
    starttag: '/* inject:imports */',
    endtag: '/* endinject */',
    transform: function (filepath) {
      return util.format('@import \'../..%s\';', filepath);
    }
  };

  var injectConfig = {
    read: false,
    relative: false
  };

  var configPreprocessor = {
    outputStyle: 'compressed'
  };

  gulp
    .src(files.styles.src)
    .pipe(inject(gulp.src(dependencies, injectConfig), injectTransform))
    .pipe(sourcemaps.init())
    .pipe(sass(configPreprocessor).on('error', onError))
    .pipe(autoprefixer())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(files.styles.dest))
    .pipe(browserSync.stream());
});

gulp.task('scripts', function() {
  gulp
    .src(files.scripts.src)
    .pipe(sourcemaps.init())
    .pipe(concat('app.js'))
    .pipe(uglify())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(files.scripts.dest));
});

gulp.task('views', function() {
  gulp
    .src(files.views.src)
    .pipe(plumber({ errorHandler: onError }))
    .pipe(jade())
    .pipe(gulp.dest(files.views.dest));
});

gulp.task('dependencies', function() {
  var path = require('path');
  var bower = require('bower-files')();

  var cssFiles = [
    path.join(__dirname, '/bower_components/reveal-js/css/reveal.min.css'),
    path.join(__dirname, '/bower_components/reveal-js/css/theme/default.css'),
    path.join(__dirname, '/bower_components/reveal-js/lib/css/zenburn.css')
  ];

  var scriptFiles = [
    path.join(__dirname, '/bower_components/reveal-js/lib/js/head.min.js'),
    path.join(__dirname, '/bower_components/reveal-js/js/reveal.min.js')
  ];

  var styles = bower.ext('css').files;
  styles = styles.concat(cssFiles);
  var scripts = bower.ext('js').files;
  scripts = scripts.concat(scriptFiles);

  gulp
    .src(styles) // bower.ext('css').files
    .pipe(concat('vendor.css'))
    .pipe(gulp.dest('./public/styles'));

  gulp
    .src(scripts) // bower.ext('js').files
    .pipe(concat('vendor.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./public/scripts'));
});

gulp.task('watch-gulpfile', function() {
  var process;
  gulp
    .watch('gulpfile.js', function() {
      if (process) {
        process.kill();
      }
      // var task = argv.task ? argv.task : 'default';
      process = spawn('gulp', [], {stdio: 'inherit'});
    });
});

gulp.task('lint', function() {
  var beep = function() {
    gutil.beep();
  };

  gulp
    .src(lintScripts)
    .pipe(jshint())
    .pipe(jshint.reporter(beep))
    .pipe(jshint.reporter(stylish));
});

gulp.task('watch', function() {
  gulp.watch(files.views.src, ['views', browserSync.reload]);
  gulp.watch('./assets/styles/**/*.scss', ['styles']);
  gulp.watch(files.scripts.src, ['scripts', browserSync.reload]);
  gulp.watch(lintScripts, ['lint']);
  gulp.watch('./bower.json', [
    'dependencies',
    'styles'
  ]);
});

gulp.task('default', [
  'dependencies',
  'views',
  'browser-sync',
  'sprites',
  'styles',
  'scripts',
  'lint',
  'watch'
]);

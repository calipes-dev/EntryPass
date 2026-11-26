<?php

$views = sys_get_temp_dir().'/entrypass-views';
if (!is_dir($views) && !mkdir($views, 0700, true) && !is_dir($views)) {
    throw new RuntimeException('Unable to create compiled view directory.');
}
$_ENV['VIEW_COMPILED_PATH'] = $_SERVER['VIEW_COMPILED_PATH'] = $views;
require __DIR__.'/../public/index.php';

<?php

use Illuminate\Http\Request;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\SectionController;
use App\Http\Controllers\IssuesController;
use App\Http\Controllers\DesignController;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::apiResource('accounts', AccountController::class);
Route::post('/login', [AccountController::class, 'login']);
Route::post('/reset-password', [AccountController::class, 'resetPassword']);

Route::apiResource('sections', SectionController::class);

Route::apiResource('issues', IssuesController::class);

Route::get('/design', [DesignController::class, 'index']);
Route::post('/design', [DesignController::class, 'store']);
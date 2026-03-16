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
Route::put('/accounts/{id}', [AccountController::class, 'update']);

Route::post('/login', [AccountController::class, 'login']);
Route::post('/reset-password', [AccountController::class, 'resetPassword']);

Route::apiResource('sections', SectionController::class);

Route::apiResource('issues', IssuesController::class);

Route::get('/design', [DesignController::class, 'index']);
Route::post('/design', [DesignController::class, 'store']);
Route::put('/design/{id}', [DesignController::class, 'update']);
Route::delete('/design/{id}', [DesignController::class, 'destroy']);

// routes/api.php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user-data', [UserController::class, 'index']);
});

// Route for downloading a section file
Route::get('/sections/{id}/download', [SectionController::class, 'download']);
Route::get('/design/{id}/download', [DesignController::class, 'download']);
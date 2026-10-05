<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\PlayerEvaluationRequest;
use App\Http\Resources\PlayerEvaluationResource;
use App\Models\Player;
use App\Models\PlayerEvaluation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EvaluationController extends Controller
{
    public function index(Request $request)
    {
        $evaluations = PlayerEvaluation::with('skillScores')
            ->when($request->filled('player_id'), fn ($q) => $q->where('player_id', $request->integer('player_id')))
            ->latest('evaluated_at')->paginate(min($request->integer('per_page', 20), 100));
        return PlayerEvaluationResource::collection($evaluations)->additional(['success' => true]);
    }

    public function show(PlayerEvaluation $evaluation): PlayerEvaluationResource
    {
        return new PlayerEvaluationResource($evaluation->load('skillScores'));
    }

    public function store(PlayerEvaluationRequest $request)
    {
        $evaluation = $this->save($request, new PlayerEvaluation());
        return (new PlayerEvaluationResource($evaluation))->additional(['success' => true])
            ->response()->setStatusCode(201);
    }

    public function update(PlayerEvaluationRequest $request, PlayerEvaluation $evaluation)
    {
        $evaluation = $this->save($request, $evaluation);
        return new PlayerEvaluationResource($evaluation);
    }

    public function destroy(PlayerEvaluation $evaluation)
    {
        $evaluation->delete();
        return response()->json(['success' => true, 'data' => null, 'meta' => []]);
    }

    public function playerEvaluations(Player $player)
    {
        return PlayerEvaluationResource::collection(
            $player->evaluations()->with('skillScores')->latest('evaluated_at')->get()
        )->additional(['success' => true]);
    }

    public function development(Player $player)
    {
        $evaluations = $player->evaluations()->with('skillScores')->orderBy('evaluated_at')->get();
        $skills = $evaluations->flatMap->skillScores->groupBy('skill')->map(fn ($scores) => [
            'skill' => $scores->first()->skill,
            'latest_score' => $scores->last()->score,
            'average_score' => round($scores->avg('score'), 2),
            'history' => $scores->map(fn ($score) => ['score' => $score->score, 'evaluation_id' => $score->player_evaluation_id])->values(),
        ])->values();

        return response()->json(['success' => true, 'data' => [
            'player' => $player,
            'evaluations' => PlayerEvaluationResource::collection($evaluations),
            'skills' => $skills,
        ], 'meta' => []]);
    }

    private function save(PlayerEvaluationRequest $request, PlayerEvaluation $evaluation): PlayerEvaluation
    {
        $data = $request->validated();
        $scores = $data['scores'] ?? [];
        $skillScores = $data['skill_scores'] ?? [];
        unset($data['scores'], $data['skill_scores']);
        $data['evaluator_id'] = $request->user()->id;
        $data['evaluated_at'] = $data['evaluated_at'] ?? now()->toDateString();

        return DB::transaction(function () use ($evaluation, $data, $scores, $skillScores) {
            $evaluation->fill($data)->save();
            foreach ($scores as $skill => $score) {
                $skillScores[] = ['skill' => $skill, 'score' => $score];
            }
            foreach ($skillScores as $score) {
                $evaluation->skillScores()->updateOrCreate(
                    ['skill' => $score['skill']],
                    ['score' => $score['score'], 'comment' => $score['comment'] ?? null]
                );
            }
            return $evaluation->load('skillScores');
        });
    }
}

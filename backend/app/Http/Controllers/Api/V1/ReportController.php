<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Player;
use App\Models\TrainingSession;
use App\Models\Attendance;
use App\Models\PlayerEvaluation;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    /**
     * Get aggregated summary report for attendance & evaluations.
     */
    public function summary(Request $request): JsonResponse
    {
        $data = $this->buildReportData($request);
        return response()->json([
            'success' => true,
            'data' => $data,
            'meta' => [],
        ]);
    }

    /**
     * Export report as CSV with UTF-8 BOM for Excel compatibility.
     */
    public function exportCsv(Request $request): StreamedResponse
    {
        $classFilter = $request->string('class_grade')->toString();
        $classLabel = $classFilter ? "Kelas_{$classFilter}" : "Semua_Kelas";
        $fileName = "laporan_futsal_{$classLabel}_" . now()->format('Ymd_His') . ".csv";

        $reportData = $this->buildReportData($request);
        $rows = $reportData['players'];

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($rows, $classLabel, $reportData) {
            $handle = fopen('php://output', 'w');
            // Write UTF-8 BOM so Excel opens it with correct encoding
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            // Report Header
            fputcsv($handle, ['LAPORAN RINGKASAN KEHADIRAN DAN PENILAIAN SISWA EKSTRAKURIKULER FUTSAL']);
            fputcsv($handle, ['Filter Kelas:', $classLabel]);
            fputcsv($handle, ['Tanggal Cetak:', now()->format('d-m-Y H:i') . ' WIB']);
            fputcsv($handle, ['Total Siswa:', $reportData['summary']['total_students']]);
            fputcsv($handle, ['Rata-rata Kehadiran:', $reportData['summary']['overall_attendance_rate'] . '%']);
            fputcsv($handle, ['Rata-rata Nilai:', $reportData['summary']['overall_evaluation_score'] ?? '-']);
            fputcsv($handle, []); // empty line

            // Table Header
            fputcsv($handle, [
                'No',
                'Nama Lengkap',
                'No Punggung',
                'Kelas',
                'Posisi Utama',
                'Kaki Utama',
                'Status Pemain',
                'Total Sesi',
                'Hadir',
                'Terlambat',
                'Absen/Izin',
                'Persentase Kehadiran (%)',
                'Rata-rata Nilai',
                'Predikat Nilai',
                'Jumlah Evaluasi',
                'Catatan Terakhir',
            ]);

            // Table Rows
            $no = 1;
            foreach ($rows as $item) {
                fputcsv($handle, [
                    $no++,
                    $item['full_name'],
                    $item['jersey_number'],
                    'Kelas ' . $item['class_grade'],
                    $item['primary_position'],
                    $item['primary_kick'],
                    $item['status'] === 'active' ? 'Aktif' : 'Nonaktif',
                    $item['attendance']['total_sessions'],
                    $item['attendance']['present'],
                    $item['attendance']['late'],
                    $item['attendance']['absent'],
                    $item['attendance']['rate'] . '%',
                    $item['evaluation']['average_score'] !== null ? $item['evaluation']['average_score'] : '-',
                    $item['evaluation']['grade_label'],
                    $item['evaluation']['evaluations_count'],
                    $item['evaluation']['latest_notes'] ?? '-',
                ]);
            }

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Build report dataset for JSON / CSV.
     */
    private function buildReportData(Request $request): array
    {
        $classGrade = $request->string('class_grade')->toString();
        $status = $request->string('status')->toString();

        // 1. Get training sessions
        $sessionQuery = TrainingSession::query();
        if ($request->filled('start_date')) {
            $sessionQuery->where('training_date', '>=', $request->string('start_date'));
        }
        if ($request->filled('end_date')) {
            $sessionQuery->where('training_date', '<=', $request->string('end_date'));
        }
        $totalSessions = $sessionQuery->count();
        $sessionIds = $sessionQuery->pluck('id');

        // 2. Query players with eager loaded relationships
        $playerQuery = Player::query()
            ->when(!empty($classGrade) && $classGrade !== 'all', fn ($q) => $q->where('class_grade', $classGrade))
            ->when(!empty($status) && $status !== 'all', fn ($q) => $q->where('status', $status))
            ->with([
                'attendances' => function ($q) use ($sessionIds) {
                    if ($sessionIds->isNotEmpty()) {
                        $q->whereIn('training_session_id', $sessionIds);
                    }
                },
                'evaluations.skillScores'
            ])
            ->orderBy('class_grade')
            ->orderBy('jersey_number');

        $players = $playerQuery->get();

        $rows = [];
        $totalAttendanceRates = 0;
        $evalScoresSum = 0;
        $evaluatedCount = 0;

        $classBreakdown = [
            '10' => ['count' => 0, 'present_sum' => 0, 'total_sessions' => 0, 'eval_sum' => 0, 'eval_count' => 0],
            '11' => ['count' => 0, 'present_sum' => 0, 'total_sessions' => 0, 'eval_sum' => 0, 'eval_count' => 0],
            '12' => ['count' => 0, 'present_sum' => 0, 'total_sessions' => 0, 'eval_sum' => 0, 'eval_count' => 0],
        ];

        foreach ($players as $player) {
            $grade = $player->class_grade ?? '10';

            // Attendance calculation
            $attendances = $player->attendances;
            $present = $attendances->where('status', 'present')->count();
            $late = $attendances->where('status', 'late')->count();
            $attended = $present + $late;
            $absent = max(0, $totalSessions - $attended);
            $rate = $totalSessions > 0 ? round(($attended / $totalSessions) * 100, 1) : 0;

            $totalAttendanceRates += $rate;

            // Evaluation calculation
            $evaluations = $player->evaluations;
            $evalCount = $evaluations->count();
            $avgScore = null;
            $gradeLabel = 'Belum Dinilai';
            $latestNotes = null;
            $latestDate = null;

            if ($evalCount > 0) {
                $allSkillScores = $evaluations->flatMap->skillScores;
                if ($allSkillScores->isNotEmpty()) {
                    $avgScore = round($allSkillScores->avg('score'), 1);
                    $evalScoresSum += $avgScore;
                    $evaluatedCount++;

                    if ($avgScore >= 85) {
                        $gradeLabel = 'Sangat Baik (A)';
                    } elseif ($avgScore >= 75) {
                        $gradeLabel = 'Baik (B)';
                    } elseif ($avgScore >= 65) {
                        $gradeLabel = 'Cukup (C)';
                    } else {
                        $gradeLabel = 'Perlu Peningkatan (D)';
                    }
                }

                $latestEval = $evaluations->sortByDesc('evaluated_at')->first();
                if ($latestEval) {
                    $latestDate = $latestEval->evaluated_at?->toDateString();
                    $latestNotes = $latestEval->notes;
                }
            }

            // Breakdown by class
            if (isset($classBreakdown[$grade])) {
                $classBreakdown[$grade]['count']++;
                $classBreakdown[$grade]['present_sum'] += $attended;
                $classBreakdown[$grade]['total_sessions'] += $totalSessions;
                if ($avgScore !== null) {
                    $classBreakdown[$grade]['eval_sum'] += $avgScore;
                    $classBreakdown[$grade]['eval_count']++;
                }
            }

            $rows[] = [
                'id' => $player->id,
                'full_name' => $player->full_name,
                'jersey_number' => $player->jersey_number,
                'class_grade' => $grade,
                'primary_position' => $player->primary_position,
                'secondary_position' => $player->secondary_position,
                'primary_kick' => $player->primary_kick ?? 'right',
                'status' => $player->status,
                'profile_photo' => $player->profile_photo,
                'attendance' => [
                    'total_sessions' => $totalSessions,
                    'present' => $present,
                    'late' => $late,
                    'absent' => $absent,
                    'rate' => $rate,
                ],
                'evaluation' => [
                    'evaluations_count' => $evalCount,
                    'average_score' => $avgScore,
                    'grade_label' => $gradeLabel,
                    'latest_date' => $latestDate,
                    'latest_notes' => $latestNotes,
                ],
            ];
        }

        $totalPlayers = count($players);
        $overallAttendanceRate = $totalPlayers > 0 ? round($totalAttendanceRates / $totalPlayers, 1) : 0;
        $overallEvalScore = $evaluatedCount > 0 ? round($evalScoresSum / $evaluatedCount, 1) : null;

        // Finalize breakdown summary
        $classSummary = [];
        foreach ($classBreakdown as $cGrade => $cData) {
            $cTotalMax = $cData['total_sessions'];
            $cRate = $cTotalMax > 0 ? round(($cData['present_sum'] / $cTotalMax) * 100, 1) : 0;
            $cAvgEval = $cData['eval_count'] > 0 ? round($cData['eval_sum'] / $cData['eval_count'], 1) : null;

            $classSummary[$cGrade] = [
                'label' => 'Kelas ' . $cGrade,
                'students_count' => $cData['count'],
                'attendance_rate' => $cRate,
                'average_score' => $cAvgEval,
            ];
        }

        return [
            'summary' => [
                'total_students' => $totalPlayers,
                'total_sessions' => $totalSessions,
                'overall_attendance_rate' => $overallAttendanceRate,
                'overall_evaluation_score' => $overallEvalScore,
                'by_class' => $classSummary,
            ],
            'players' => $rows,
        ];
    }
}

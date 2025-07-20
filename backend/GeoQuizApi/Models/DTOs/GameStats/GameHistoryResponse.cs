namespace GeoQuizApi.Models.DTOs.GameStats;

public class GameHistoryResponse
{
    public List<GameSessionDto> Sessions { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public bool HasNextPage { get; set; }
}

public class GameSessionDto
{
    public string Id { get; set; } = string.Empty;
    public string GameType { get; set; } = string.Empty;
    public int CorrectAnswers { get; set; }
    public int WrongAnswers { get; set; }
    public double Accuracy { get; set; }
    public DateTime SessionStartTime { get; set; }
    public DateTime? SessionEndTime { get; set; }
    public int? SessionDurationMs { get; set; }
    public DateTime CreatedAt { get; set; }
}
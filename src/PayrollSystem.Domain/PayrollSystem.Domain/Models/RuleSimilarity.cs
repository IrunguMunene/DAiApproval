namespace PayrollSystem.Domain.Models;

public class RuleSimilarity
{
    public Guid RuleId { get; set; }
    public string RuleStatement { get; set; } = string.Empty;
    public string RuleDescription { get; set; } = string.Empty;
    public double SimilarityScore { get; set; }
    public string OrganizationId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class VectorSearchRequest
{
    public string RuleText { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;
    public double SimilarityThreshold { get; set; } = 0.8;
    public int MaxResults { get; set; } = 5;
}

public class VectorSearchResult
{
    public List<RuleSimilarity> SimilarRules { get; set; } = new();
    public bool HasSimilarRules => SimilarRules.Count > 0;
    public double HighestSimilarity => SimilarRules.Count > 0 ? SimilarRules.Max(r => r.SimilarityScore) : 0.0;
}
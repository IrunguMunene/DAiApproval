using PayrollSystem.Domain.Models;

namespace PayrollSystem.Domain.Interfaces;

public interface IVectorSimilarityService
{
    /// <summary>
    /// Initialize Qdrant collection if it doesn't exist
    /// </summary>
    Task InitializeAsync();
    
    /// <summary>
    /// Store rule vector in Qdrant database
    /// </summary>
    /// <param name="ruleId">Unique rule identifier</param>
    /// <param name="ruleText">Rule text to vectorize and store</param>
    /// <param name="metadata">Additional metadata to store with vector</param>
    Task StoreRuleVectorAsync(Guid ruleId, string ruleText, Dictionary<string, object> metadata);
    
    /// <summary>
    /// Search for similar rules based on text similarity
    /// </summary>
    /// <param name="request">Vector search request parameters</param>
    /// <returns>Vector search result with similar rules</returns>
    Task<VectorSearchResult> SearchSimilarRulesAsync(VectorSearchRequest request);
    
    
    /// <summary>
    /// Check if vector similarity service is enabled and available
    /// </summary>
    /// <returns>True if service is available, false otherwise</returns>
    Task<bool> IsEnabledAsync();
    
    /// <summary>
    /// Get collection statistics
    /// </summary>
    /// <returns>Dictionary with collection stats like vector count</returns>
    Task<Dictionary<string, object>> GetCollectionStatsAsync();
}
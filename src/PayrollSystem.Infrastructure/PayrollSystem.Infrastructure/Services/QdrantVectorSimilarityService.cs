using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PayrollSystem.Domain.Interfaces;
using PayrollSystem.Domain.Models;
using Qdrant.Client;
using Qdrant.Client.Grpc;
using Grpc.Net.Client;

namespace PayrollSystem.Infrastructure.Services;

public class QdrantVectorSimilarityService : IVectorSimilarityService
{
    private readonly QdrantClient _qdrantClient;
    private readonly IVectorEmbeddingService _embeddingService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<QdrantVectorSimilarityService> _logger;
    
    private readonly string _collectionName;
    private readonly bool _isEnabled;
    private readonly double _similarityThreshold;
    private readonly int _maxResults;
    private readonly uint _vectorSize;

    public QdrantVectorSimilarityService(
        IVectorEmbeddingService embeddingService,
        IConfiguration configuration,
        ILogger<QdrantVectorSimilarityService> logger)
    {
        _embeddingService = embeddingService;
        _configuration = configuration;
        _logger = logger;

        _collectionName = configuration.GetValue<string>("Qdrant:CollectionName") ?? "payroll_rules";
        _isEnabled = configuration.GetValue<bool>("Qdrant:EnableSimilaritySearch");
        _similarityThreshold = configuration.GetValue<double>("Qdrant:SimilarityThreshold");
        _maxResults = configuration.GetValue<int>("Qdrant:MaxSimilarResults");
        _vectorSize = (uint)configuration.GetValue<int>("Qdrant:VectorSize");

        // Log configuration for debugging
        _logger.LogInformation("Qdrant configuration - Enabled: {Enabled}, Threshold: {Threshold}, MaxResults: {MaxResults}, VectorSize: {VectorSize}", 
            _isEnabled, _similarityThreshold, _maxResults, _vectorSize);

        if (_isEnabled)
        {
            var qdrantUrl = configuration.GetValue<string>("Qdrant:BaseUrl") ?? "http://localhost:6334";
            try
            {
                // Parse the URL to extract host for gRPC connection
                var uri = new Uri(qdrantUrl);
                var host = uri.Host;
                
                // For local development without TLS, use simple constructor
                // This defaults to http://localhost:6334 for gRPC
                _qdrantClient = new QdrantClient(host);
                _logger.LogInformation("QdrantClient initialized successfully with host: {Host} (gRPC port: 6334)", host);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize QdrantClient, disabling vector similarity");
                _isEnabled = false;
                _qdrantClient = null!;
            }
        }
        else
        {
            _qdrantClient = null!; // Will not be used when disabled
        }
    }

    public async Task InitializeAsync()
    {
        if (!_isEnabled)
        {
            _logger.LogInformation("Vector similarity search is disabled");
            return;
        }

        try
        {
            _logger.LogInformation("Initializing Qdrant collection: {CollectionName}", _collectionName);

            // Check if collection exists
            var collections = await _qdrantClient.ListCollectionsAsync();
            var collectionExists = collections.Any(c => c == _collectionName);

            if (!collectionExists)
            {
                _logger.LogInformation("Creating new collection: {CollectionName} with vector size: {VectorSize}", 
                    _collectionName, _vectorSize);

                await _qdrantClient.CreateCollectionAsync(_collectionName, new VectorParams
                {
                    Size = _vectorSize,
                    Distance = Distance.Cosine
                });

                _logger.LogInformation("Collection created successfully: {CollectionName}", _collectionName);
            }
            else
            {
                _logger.LogInformation("Collection already exists: {CollectionName}", _collectionName);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize Qdrant collection: {CollectionName}", _collectionName);
            throw;
        }
    }

    public async Task StoreRuleVectorAsync(Guid ruleId, string ruleText, Dictionary<string, object> metadata)
    {
        if (!_isEnabled)
        {
            _logger.LogDebug("Vector similarity search is disabled, skipping vector storage");
            return;
        }

        try
        {
            _logger.LogInformation("Storing vector for rule: {RuleId}", ruleId);

            // Generate embedding for the rule text
            var embedding = await _embeddingService.GenerateEmbeddingAsync(ruleText);

            // Create point with metadata
            var payload = new Dictionary<string, Value>();
            
            // Add metadata as payload
            foreach (var kvp in metadata)
            {
                payload[kvp.Key] = kvp.Value?.ToString() ?? "";
            }

            // Add rule text for reference
            payload["rule_text"] = ruleText;
            payload["created_at"] = DateTime.UtcNow.ToString("O");

            var pointStruct = new PointStruct 
            { 
                Id = new PointId { Uuid = ruleId.ToString() }, 
                Vectors = embedding
            };
            
            foreach (var kvp in payload)
            {
                pointStruct.Payload[kvp.Key] = kvp.Value;
            }

            await _qdrantClient.UpsertAsync(_collectionName, new[] { pointStruct });

            _logger.LogInformation("Successfully stored vector for rule: {RuleId}", ruleId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to store vector for rule: {RuleId}", ruleId);
            throw;
        }
    }

    public async Task<VectorSearchResult> SearchSimilarRulesAsync(VectorSearchRequest request)
    {
        if (!_isEnabled)
        {
            _logger.LogDebug("Vector similarity search is disabled, returning empty result");
            return new VectorSearchResult();
        }

        try
        {
            _logger.LogInformation("Searching for similar rules to: {RuleText}", 
                request.RuleText.Length > 50 ? request.RuleText.Substring(0, 50) + "..." : request.RuleText);

            // Generate embedding for search text
            var embedding = await _embeddingService.GenerateEmbeddingAsync(request.RuleText);

            // Create filter if organization is specified
            Filter? filter = null;
            if (!string.IsNullOrEmpty(request.OrganizationId))
            {
                filter = new Filter
                {
                    Must =
                    {
                        new Condition
                        {
                            Field = new FieldCondition
                            {
                                Key = "organization_id",
                                Match = new Match { Text = request.OrganizationId }
                            }
                        }
                    }
                };
            }

            var searchResults = await _qdrantClient.SearchAsync(
                collectionName: _collectionName,
                vector: embedding,
                filter: filter,
                limit: (ulong)request.MaxResults,
                scoreThreshold: (float)request.SimilarityThreshold
            );

            var similarRules = searchResults.Select(result => new RuleSimilarity
            {
                RuleId = Guid.Parse(result.Id.ToString()),
                RuleStatement = result.Payload.GetValueOrDefault("rule_statement")?.StringValue ?? "",
                RuleDescription = result.Payload.GetValueOrDefault("rule_description")?.StringValue ?? "",
                SimilarityScore = result.Score,
                OrganizationId = result.Payload.GetValueOrDefault("organization_id")?.StringValue ?? "",
                CreatedAt = DateTime.TryParse(result.Payload.GetValueOrDefault("created_at")?.StringValue, out var createdAt) 
                    ? createdAt : DateTime.MinValue,
                CreatedBy = result.Payload.GetValueOrDefault("created_by")?.StringValue ?? "",
                Status = result.Payload.GetValueOrDefault("status")?.StringValue ?? ""
            }).ToList();

            _logger.LogInformation("Found {Count} similar rules above threshold {Threshold}", 
                similarRules.Count, request.SimilarityThreshold);

            return new VectorSearchResult { SimilarRules = similarRules };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to search for similar rules");
            throw;
        }
    }


    public Task<bool> IsEnabledAsync()
    {
        return Task.FromResult(_isEnabled);
    }

    public async Task<Dictionary<string, object>> GetCollectionStatsAsync()
    {
        if (!_isEnabled)
        {
            return new Dictionary<string, object>
            {
                ["enabled"] = false,
                ["message"] = "Vector similarity search is disabled"
            };
        }

        try
        {
            var collectionInfo = await _qdrantClient.GetCollectionInfoAsync(_collectionName);
            
            return new Dictionary<string, object>
            {
                ["enabled"] = true,
                ["collection_name"] = _collectionName,
                ["points_count"] = collectionInfo.PointsCount,
                ["vector_size"] = _vectorSize,
                ["distance"] = "Cosine"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get collection stats");
            return new Dictionary<string, object>
            {
                ["enabled"] = true,
                ["error"] = ex.Message
            };
        }
    }
}
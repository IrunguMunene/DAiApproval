using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PayrollSystem.Domain.Interfaces;

namespace PayrollSystem.Infrastructure.Services;

public class OllamaEmbeddingService : IVectorEmbeddingService
{
    private readonly HttpClient _httpClient;
    private readonly string _ollamaBaseUrl;
    private readonly string _embeddingModel;
    private readonly ILogger<OllamaEmbeddingService> _logger;

    public OllamaEmbeddingService(
        HttpClient httpClient, 
        IConfiguration configuration,
        ILogger<OllamaEmbeddingService> logger)
    {
        _httpClient = httpClient;
        _ollamaBaseUrl = configuration.GetValue<string>("Ollama:BaseUrl") ?? "http://localhost:11434";
        _embeddingModel = configuration.GetValue<string>("Ollama:EmbeddingModel") ?? "nomic-embed-text";
        _logger = logger;
    }

    public async Task<float[]> GenerateEmbeddingAsync(string text)
    {
        try
        {
            _logger.LogInformation("Generating embedding for text length: {TextLength}", text.Length);
            
            var request = new
            {
                model = _embeddingModel,
                prompt = text,
                stream = false
            };

            var response = await _httpClient.PostAsync($"{_ollamaBaseUrl}/api/embeddings",
                new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json"));

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to generate embedding: {StatusCode} - {Content}", 
                    response.StatusCode, errorContent);
                throw new Exception($"Failed to generate embedding: {response.StatusCode}");
            }

            var responseContent = await response.Content.ReadAsStringAsync();
            var responseJson = JsonSerializer.Deserialize<JsonElement>(responseContent);
            
            if (responseJson.TryGetProperty("embedding", out var embeddingElement))
            {
                var embeddingArray = embeddingElement.EnumerateArray()
                    .Select(e => (float)e.GetDouble())
                    .ToArray();
                
                _logger.LogInformation("Generated embedding with {VectorSize} dimensions", embeddingArray.Length);
                return embeddingArray;
            }
            
            throw new Exception("No embedding found in response");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating embedding for text: {Text}", 
                text.Length > 100 ? text.Substring(0, 100) + "..." : text);
            throw;
        }
    }

    public async Task<List<float[]>> GenerateEmbeddingsAsync(List<string> texts)
    {
        var embeddings = new List<float[]>();
        
        foreach (var text in texts)
        {
            var embedding = await GenerateEmbeddingAsync(text);
            embeddings.Add(embedding);
        }
        
        return embeddings;
    }

    public async Task<bool> IsAvailableAsync()
    {
        try
        {
            // Check if Ollama is running
            var healthResponse = await _httpClient.GetAsync($"{_ollamaBaseUrl}/api/tags");
            if (!healthResponse.IsSuccessStatusCode)
            {
                return false;
            }

            // Check if the embedding model is available
            var responseContent = await healthResponse.Content.ReadAsStringAsync();
            var responseJson = JsonSerializer.Deserialize<JsonElement>(responseContent);
            
            if (responseJson.TryGetProperty("models", out var modelsElement))
            {
                var models = modelsElement.EnumerateArray()
                    .Select(m => m.GetProperty("name").GetString())
                    .Where(name => name != null)
                    .ToList();

                var isModelAvailable = models.Any(model => model!.StartsWith(_embeddingModel));
                
                if (!isModelAvailable)
                {
                    _logger.LogWarning("Embedding model {EmbeddingModel} not found. Available models: {Models}", 
                        _embeddingModel, string.Join(", ", models));
                }
                
                return isModelAvailable;
            }
            
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking Ollama embedding service availability");
            return false;
        }
    }
}
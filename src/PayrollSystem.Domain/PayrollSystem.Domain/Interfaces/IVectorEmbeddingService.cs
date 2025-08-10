namespace PayrollSystem.Domain.Interfaces;

public interface IVectorEmbeddingService
{
    /// <summary>
    /// Generate vector embedding for given text using Ollama nomic-embed-text model
    /// </summary>
    /// <param name="text">Text to convert to vector embedding</param>
    /// <returns>Vector embedding as float array</returns>
    Task<float[]> GenerateEmbeddingAsync(string text);
    
    /// <summary>
    /// Generate vector embeddings for multiple texts in batch
    /// </summary>
    /// <param name="texts">Texts to convert to vector embeddings</param>
    /// <returns>List of vector embeddings as float arrays</returns>
    Task<List<float[]>> GenerateEmbeddingsAsync(List<string> texts);
    
    /// <summary>
    /// Check if the embedding service is available
    /// </summary>
    /// <returns>True if service is available, false otherwise</returns>
    Task<bool> IsAvailableAsync();
}
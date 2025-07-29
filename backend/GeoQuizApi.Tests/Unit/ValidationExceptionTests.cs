using FluentAssertions;
using GeoQuizApi.Models.Exceptions;

namespace GeoQuizApi.Tests.Unit;

public class ValidationExceptionTests
{
    [Fact]
    public void ValidationException_WithSingleFieldError_ShouldCreateCorrectErrorsDictionary()
    {
        // Arrange
        var fieldName = "GameType";
        var errorMessage = "Invalid game type";

        // Act
        var exception = new ValidationException(fieldName, errorMessage);

        // Assert
        exception.Errors.Should().NotBeNull();
        exception.Errors.Should().HaveCount(1);
        exception.Errors.Should().ContainKey(fieldName);
        exception.Errors[fieldName].Should().BeEquivalentTo(new[] { errorMessage });
    }

    [Fact]
    public void ValidationException_WithMultipleFieldErrors_ShouldCreateCorrectErrorsDictionary()
    {
        // Arrange
        var errors = new Dictionary<string, string[]>
        {
            { "GameType", new[] { "Invalid game type" } },
            { "CorrectAnswers", new[] { "Must be non-negative" } }
        };

        // Act
        var exception = new ValidationException(errors);

        // Assert
        exception.Errors.Should().NotBeNull();
        exception.Errors.Should().HaveCount(2);
        exception.Errors.Should().ContainKey("GameType");
        exception.Errors.Should().ContainKey("CorrectAnswers");
        exception.Errors["GameType"].Should().BeEquivalentTo(new[] { "Invalid game type" });
        exception.Errors["CorrectAnswers"].Should().BeEquivalentTo(new[] { "Must be non-negative" });
    }
}
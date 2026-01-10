using HtmlAgilityPack;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Globalization;
using System;
using System.Reflection;
using TinyMCE.Umbraco.Premium.PropertyEditors;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Blocks;
using Umbraco.Cms.Core.Configuration.Models;
using Umbraco.Cms.Core.DeliveryApi;
using Umbraco.Cms.Core.Deploy;
using Umbraco.Cms.Core.Macros;
using Umbraco.Cms.Core.Models.Blocks;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.PropertyEditors.DeliveryApi;
using Umbraco.Cms.Core.PropertyEditors.ValueConverters;
using Umbraco.Cms.Core.Serialization;
using Umbraco.Cms.Core.Strings;
using Umbraco.Cms.Core.Templates;
using Umbraco.Cms.Core.Web;
using static Umbraco.Cms.Core.Constants.HttpContext;
using static Umbraco.Cms.Core.PropertyEditors.BlockListConfiguration;
using static System.Net.Mime.MediaTypeNames;

namespace TinyMCE.Umbraco.Premium.ValueConverters
{
	/// <summary>
	///     Value converter for the TinyMCE Umbraco Premium RTE so that it always returns IHtmlString so that Html.Raw doesn't have to be used.
	///     
	///		NOTE: extending the normal RTE ValueConverter so that locallinks and other key items are converted.
	///		
	///		Extends Umbraco-CMS\src\Umbraco.Infrastructure\PropertyEditors\ValueConverters\RteMacroRenderingValueConverter.cs
	/// </summary>
	public class TinyMceUmbracoPremiumValueConverter : RteMacroRenderingValueConverter, IDeliveryApiPropertyValueConverter, IDisposable
	{
		private readonly HtmlImageSourceParser _imageSourceParser;
		private readonly HtmlLocalLinkParser _linkParser;
		private readonly IMacroRenderer _macroRenderer;
		private readonly HtmlUrlParser _urlParser;
		private readonly IJsonSerializer _jsonSerializer;
		private readonly ILogger<TinyMceUmbracoPremiumValueConverter> _logger;
		private readonly RichTextBlockPropertyValueConstructorCache _constructorCache;
		private readonly BlockEditorConverter _blockEditorConverter;
		private readonly TinyRichTextEditorBlockDataConverter _blockDataConverter;

		public TinyMceUmbracoPremiumValueConverter(IUmbracoContextAccessor umbracoContextAccessor, IMacroRenderer macroRenderer,
		HtmlLocalLinkParser linkParser, HtmlUrlParser urlParser, HtmlImageSourceParser imageSourceParser,
		IApiRichTextElementParser apiRichTextElementParser, IApiRichTextMarkupParser apiRichTextMarkupParser,
		IPartialViewBlockEngine partialViewBlockEngine, BlockEditorConverter blockEditorConverter, IJsonSerializer jsonSerializer,
		IApiElementBuilder apiElementBuilder, RichTextBlockPropertyValueConstructorCache constructorCache, ILogger<TinyMceUmbracoPremiumValueConverter> logger,
		IOptionsMonitor<DeliveryApiSettings> deliveryApiSettingsMonitor) 
			: base(umbracoContextAccessor, macroRenderer, linkParser, urlParser, imageSourceParser, apiRichTextElementParser, apiRichTextMarkupParser,
				  partialViewBlockEngine, blockEditorConverter, jsonSerializer, apiElementBuilder, constructorCache, logger, deliveryApiSettingsMonitor)
		{
			_linkParser = linkParser;
			_urlParser = urlParser;
			_imageSourceParser = imageSourceParser;
			_macroRenderer = macroRenderer;
			_jsonSerializer = jsonSerializer;
			_logger = logger;
			_constructorCache = constructorCache;
			_blockEditorConverter = blockEditorConverter;
			_blockDataConverter = new TinyRichTextEditorBlockDataConverter();
		}

		public override bool IsConverter(IPublishedPropertyType propertyType)
			=> propertyType.EditorAlias == Constants.PropertyEditors.Aliases.TinyMceUmbracoPremiumRte;

		// Doing these because we don't have access to RichTextEditorIntermediateValue
		public bool IsRichTextBlockModelNull(object intermediateValue)
		{
			bool isNull = false;
			foreach (var v in intermediateValue.GetType().GetProperties())
			{
				if (v.Name == "RichTextBlockModel")
				{
					if (v.GetValue(intermediateValue) == null)
					{
						isNull = true;
					}
				}
			}

			return isNull;
		}

		/// <summary>
		/// Did it this way because there was no IRichTextEditorIntermediateValue interface.  
		/// 
		/// TODO: create a new model with this interface?
		/// </summary>
		/// <param name="intermediateValue"></param>
		/// <returns></returns>
		public RichTextBlockModel GetRichTextBlockModelProperty(object intermediateValue)
		{
			foreach (var v in intermediateValue.GetType().GetProperties())
			{
				if (v.Name == "RichTextBlockModel")
				{
					var propertyValue = v.GetValue(intermediateValue);
					if (propertyValue != null)
					{
						return (RichTextBlockModel)propertyValue;
					}
				}
			}

			return RichTextBlockModel.Empty;
		}

		/// <summary>
		/// Did it this way because there was no IRichTextEditorIntermediateValue interface.  
		/// 
		/// TODO: create a new model with this interface?
		/// </summary>
		/// <param name="intermediateValue"></param>
		/// <param name="richTextBlockModel"></param>
		/// <returns></returns>
		public object SetRichTextBlockModelProperty(object intermediateValue, RichTextBlockModel richTextBlockModel)
		{
			foreach (var v in intermediateValue.GetType().GetProperties())
			{
				if (v.Name == "RichTextBlockModel")
				{
					v.SetValue(intermediateValue, richTextBlockModel, null);
				}
			}

			return intermediateValue;
		}


		public override object? ConvertSourceToIntermediate(IPublishedElement owner, IPublishedPropertyType propertyType, object? source, bool preview)
		{
			var intermediateValue = base.ConvertSourceToIntermediate(owner,propertyType,source,preview);
			// Have to do it this way because the RichTextEditorIntermediateValue model is private in Umbraco and if we don't use that nothing renders
			// NOTE: in v13.2.2 there is now an interface IRichTextEditorIntermediateValue that we may be able to leverage

			if (intermediateValue == null)
			{
				return null;
			}

			if (!IsRichTextBlockModelNull(intermediateValue))
			{
				var intermediateRichTextBlockModel = GetRichTextBlockModelProperty(intermediateValue);

				if(!intermediateRichTextBlockModel.Any())
				{
					// Copying what Umbraco does here because most of the classes are internal or private and the block rendering doesn't work because they call the wrong converter
					// from the RteMacroRenderingValueConverter.ConvertSourceToIntermediate() method in Umbraco
					if (RichTextPropertyEditorHelper.TryParseRichTextEditorValue(source, _jsonSerializer, _logger, out RichTextEditorValue? richTextEditorValue) is false)
					{
						return null;
					}

					// from the RteMacroRenderingValueConverter.ParseRichTextBlockModel() method in Umbraco
					RichTextConfiguration? configuration = propertyType.DataType.ConfigurationAs<RichTextConfiguration>();
					if (configuration?.Blocks?.Any() is not true)
					{
						return null;
					}

					// Pulled from BlockPropertyValueCreatorBase.CreateBlockModel()
					BlockEditorData converted = _blockDataConverter.Convert(richTextEditorValue.Blocks);

					// Used in this method only 
					var referenceCacheLevel = PropertyCacheLevel.Element;

					var richTextBlockModel = RichTextBlockModel.Empty;

                    ///////
                    // Pulled from BlockPropertyValueCreatorBase.CreateBlockModel()
                    // NOTE: Added this null check and check for any references to avoid errors when there are no blocks.
                    //       The layout below throws a null reference exception if there are no references.
                    if (converted == null || !converted.References.Any()) {
						return intermediateValue;
                    }
					IEnumerable<RichTextBlockLayoutItem>? layout = converted.Layout?.ToObject<IEnumerable<RichTextBlockLayoutItem>>();
					if (layout is null)
					{
						return intermediateValue;
					}
					var blockConfigMap = configuration.Blocks.ToDictionary(bc => bc.ContentElementTypeKey);
					var contentPublishedElements = new Dictionary<Guid, IPublishedElement>();

					foreach (BlockItemData data in converted.BlockValue.ContentData)
					{
						if (!blockConfigMap.ContainsKey(data.ContentTypeKey))
						{
							continue;
						}

						IPublishedElement? element = _blockEditorConverter.ConvertToElement(data, referenceCacheLevel, preview);
						if (element == null)
						{
							continue;
						}

						contentPublishedElements[element.Key] = element;
					}
					// If there are no content elements, it doesn't matter what is stored in layout
					if (contentPublishedElements.Count == 0)
					{
						return intermediateValue;
					}

					// Convert the settings data
					var settingsPublishedElements = new Dictionary<Guid, IPublishedElement>();
					var validSettingsElementTypes = blockConfigMap.Values.Select(x => x.SettingsElementTypeKey)
						.Where(x => x.HasValue).Distinct().ToList();

					foreach (BlockItemData data in converted.BlockValue.SettingsData)
					{
						if (!validSettingsElementTypes.Contains(data.ContentTypeKey))
						{
							continue;
						}

						IPublishedElement? element = _blockEditorConverter.ConvertToElement(data, referenceCacheLevel, preview);
						if (element is null)
						{
							continue;
						}

						settingsPublishedElements[element.Key] = element;
					}

					BlockItemActivator<RichTextBlockItem> blockItemActivator = new BlockItemActivator<RichTextBlockItem>(_blockEditorConverter, _constructorCache);

					RichTextBlockItem? CreateBlockItem(RichTextBlockLayoutItem layoutItem)
					{
						// Get the content reference
						var contentGuidUdi = (GuidUdi?)layoutItem.ContentUdi;
						if (contentGuidUdi is null ||
							!contentPublishedElements.TryGetValue(contentGuidUdi.Guid, out IPublishedElement? contentData))
						{
							return null;
						}

						if (!blockConfigMap.TryGetValue(
								contentData.ContentType.Key,
								out RichTextConfiguration.RichTextBlockConfiguration? blockConfig))
						{
							return null;
						}

						// Get the setting reference
						IPublishedElement? settingsData = null;
						var settingGuidUdi = (GuidUdi?)layoutItem.SettingsUdi;
						if (settingGuidUdi is not null)
						{
							settingsPublishedElements.TryGetValue(settingGuidUdi.Guid, out settingsData);
						}

						// This can happen if they have a settings type, save content, remove the settings type, and display the front-end page before saving the content again
						// We also ensure that the content types match, since maybe the settings type has been changed after this has been persisted
						if (settingsData is not null && (!blockConfig.SettingsElementTypeKey.HasValue ||
														 settingsData.ContentType.Key != blockConfig.SettingsElementTypeKey))
						{
							settingsData = null;
						}

						// Create instance (use content/settings type from configuration)
						var blockItem = blockItemActivator.CreateInstance(blockConfig.ContentElementTypeKey, blockConfig.SettingsElementTypeKey, contentGuidUdi, contentData, settingGuidUdi, settingsData);
						if (blockItem == null)
						{
							return null;
						}

						// Ensure what this does so I'm commenting it out for now
						//if (enrichBlockItem != null)
						//{
						//	blockItem = enrichBlockItem(blockItem, layoutItem, blockConfig, CreateBlockItem);
						//}

						return blockItem;
					}

					var blockItems = layout.Select(CreateBlockItem).Where(x => x != null).ToList();
					///////

					if (blockItems == null)
					{
						return intermediateValue;
					}
					else
					{
						return SetRichTextBlockModelProperty(intermediateValue, new RichTextBlockModel(blockItems));
					}
				}
				else
				{
					return intermediateValue;
				}
			}
			else
			{
				return intermediateValue;
			}
		}

		/// <summary>
		/// Pulled from BlockPropertyValueCreatorBase
		/// 
		/// Umbraco-CMS\src\Umbraco.Infrastructure\PropertyEditors\ValueConverters\BlockPropertyValueCreatorBase.cs
		/// </summary>
		/// <typeparam name="T"></typeparam>ed to the current IPublishedSnapshot and IPublishedModelFactory)
		public class BlockItemActivator<T>
			where T : IBlockReference<IPublishedElement, IPublishedElement>
		{
			protected Type GenericItemType => typeof(RichTextBlockItem<,>);

			private readonly BlockEditorConverter _blockConverter;

			private readonly BlockEditorPropertyValueConstructorCacheBase<T> _constructorCache;

			public BlockItemActivator(BlockEditorConverter blockConverter, BlockEditorPropertyValueConstructorCacheBase<T> constructorCache)
			{
				_blockConverter = blockConverter;
				_constructorCache = constructorCache;
			}

			public T CreateInstance(Guid contentTypeKey, Guid? settingsTypeKey, Udi contentUdi, IPublishedElement contentData, Udi? settingsUdi, IPublishedElement? settingsData)
			{
				if (!_constructorCache.TryGetValue(
					(contentTypeKey, settingsTypeKey),
					out Func<Udi, IPublishedElement, Udi?, IPublishedElement?, T>? constructor))
				{
					constructor = EmitConstructor(contentTypeKey, settingsTypeKey);
					_constructorCache.SetValue((contentTypeKey, settingsTypeKey), constructor);
				}

				return constructor(contentUdi, contentData, settingsUdi, settingsData);
			}

			private Func<Udi, IPublishedElement, Udi?, IPublishedElement?, T> EmitConstructor(
				Guid contentTypeKey, Guid? settingsTypeKey)
			{
				Type contentType = _blockConverter.GetModelType(contentTypeKey);
				Type settingsType = settingsTypeKey.HasValue
					? _blockConverter.GetModelType(settingsTypeKey.Value)
					: typeof(IPublishedElement);
				Type type = GenericItemType.MakeGenericType(contentType, settingsType);

				ConstructorInfo? constructor =
					type.GetConstructor(new[] { typeof(Udi), contentType, typeof(Udi), settingsType });
				if (constructor == null)
				{
					throw new InvalidOperationException($"Could not find the required public constructor on {type}.");
				}

				// We use unsafe here, because we know the constructor parameter count and types match
				return ReflectionUtilities
					.EmitConstructorUnsafe<Func<Udi, IPublishedElement, Udi?, IPublishedElement?, T>>(
						constructor);
			}
		}
	}

}
